(function vscodeExtension() {
  'use strict';

  const vscode = require('vscode');
  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');

  const hash = value =>
    crypto.createHash('sha256').update(value).digest('hex');

  const norm = value =>
    String(value).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

  let queue = Promise.resolve();

  function request(port, token, route, data) {
    return new Promise((resolve, reject) => {
      const body = data ? JSON.stringify(data) : '';

      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: route,
        method: data ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(data ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          } : {})
        }
      }, res => {
        let bytes = 0;
        const chunks = [];

        res.on('data', part => {
          bytes += part.length;

          if (bytes > 1024 * 1024) {
            req.destroy(new Error('De opdracht is te groot.'));
          } else {
            chunks.push(part);
          }
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(
              Buffer.concat(chunks).toString('utf8')
            );

            if (!result.ok) {
              reject(new Error(
                result.error || 'Dynamic7land is niet meer verbonden.'
              ));
            } else {
              resolve(result);
            }
          } catch (error) {
            reject(error);
          }
        });

        res.on('error', reject);
      });

      req.on('error', reject);

      req.setTimeout(10000, () => {
        req.destroy(new Error('Dynamic7land reageert niet.'));
      });

      req.end(body);
    });
  }

  function inspect(job, document) {
    if (
      !path.isAbsolute(job.root) ||
      !path.isAbsolute(job.file)
    ) {
      throw new Error('Ongeldige projectlocatie.');
    }

    const root = fs.realpathSync(job.root);
    const file = fs.realpathSync(job.file);
    const relative = path.relative(root, file);

    if (
      root !== job.root ||
      file !== job.file ||
      !relative ||
      relative.startsWith('..' + path.sep) ||
      path.isAbsolute(relative)
    ) {
      throw new Error(
        'Het bestand ligt buiten het gekozen project.'
      );
    }

    let item = root;

    for (const part of relative.split(path.sep)) {
      item = path.join(item, part);

      if (fs.lstatSync(item).isSymbolicLink()) {
        throw new Error('Koppelingen worden niet bewerkt.');
      }
    }

    const stat = fs.statSync(file);

    if (
      !stat.isFile() ||
      stat.nlink > 1 ||
      stat.size > 300 * 1024
    ) {
      throw new Error(
        'Het bestand kan niet veilig worden bewerkt.'
      );
    }

    const bytes = fs.readFileSync(file);

    if (hash(bytes) !== job.hash) {
      throw new Error(
        "The file changed in the meantime. " +
        'Verstuur je opdracht opnieuw.'
      );
    }

    if (document.isDirty) {
      throw new Error(
        'Sla eerst je eigen wijzigingen in VS Code op. ' +
        'Dynamic7land heeft niets overschreven.'
      );
    }

    if (hash(norm(document.getText())) !== job.textHash) {
      throw new Error(
        'VS Code toont een andere versie. ' +
        'Sla het bestand op en probeer opnieuw.'
      );
    }

    return stat;
  }

  function rawOffset(text, normalized) {
    let raw = 0;
    let count = 0;

    while (raw < text.length && count < normalized) {
      if (text[raw] === '\r' && text[raw + 1] === '\n') {
        raw++;
      }

      raw++;
      count++;
    }

    return raw;
  }

  async function run(port, token, job) {
    const uri = vscode.Uri.file(job.file);
    const doc = await vscode.workspace.openTextDocument(uri);

    const editor = await vscode.window.showTextDocument(doc, {
      preview: false,
      preserveFocus: false
    });

    inspect(job, doc);

    if (['open', 'check'].includes(job.kind)) {
      return { ok: true };
    }

    if (!['apply', 'restore'].includes(job.kind)) {
      throw new Error('Onbekende Dynamic7land-opdracht.');
    }

    const version = doc.version;
    const source = doc.getText();
    const normalized = norm(source);

    let target = normalized;

    if (job.kind === 'apply') {
      if (
        !Array.isArray(job.edits) ||
        !job.edits.length ||
        job.edits.length > 20
      ) {
        throw new Error("Invalid code change.");
      }

      let previous = -1;

      for (const edit of job.edits) {
        if (
          !Number.isInteger(edit.start) ||
          !Number.isInteger(edit.end) ||
          edit.start < 0 ||
          edit.end <= edit.start ||
          edit.end > normalized.length ||
          edit.start < previous ||
          typeof edit.text !== 'string'
        ) {
          throw new Error(
            'Ongeldig bereik voor de wijziging.'
          );
        }

        previous = edit.end;
      }

      for (const edit of [...job.edits].reverse()) {
        target =
          target.slice(0, edit.start) +
          edit.text +
          target.slice(edit.end);
      }

      if (
        !target.trim() ||
        Buffer.byteLength(target) > 300 * 1024 ||
        hash(target) !== job.targetHash
      ) {
        throw new Error(
          'De wijziging is niet volledig ontvangen.'
        );
      }
    } else {
      if (
        typeof job.content !== 'string' ||
        Buffer.byteLength(job.content) > 300 * 1024 ||
        hash(Buffer.from(job.content)) !== job.originalHash
      ) {
        throw new Error('De backup is niet geldig.');
      }
    }

    await request(port, token, '/ready', { id: job.id });

    if (doc.version !== version || doc.getText() !== source) {
      throw new Error(
        'Je hebt ondertussen in VS Code getypt. ' +
        'Er is niets overschreven.'
      );
    }

    const stat = inspect(job, doc);

    if (job.kind === 'restore') {
      const temp =
        job.file + '.' + crypto.randomUUID() + '.dynamic7land-tmp';

      try {
        fs.writeFileSync(
          temp,
          Buffer.from(job.content),
          { flag: 'wx', mode: stat.mode }
        );

        inspect(job, doc);
        fs.renameSync(temp, job.file);
      } finally {
        if (fs.existsSync(temp)) {
          fs.unlinkSync(temp);
        }
      }

      return {
        ok: true,
        savedHash: job.originalHash
      };
    }

    const edit = new vscode.WorkspaceEdit();

    const eol = doc.eol === vscode.EndOfLine.CRLF
      ? '\r\n'
      : '\n';

    for (const change of job.edits) {
      edit.replace(
        uri,
        new vscode.Range(
          doc.positionAt(rawOffset(source, change.start)),
          doc.positionAt(rawOffset(source, change.end))
        ),
        change.text.replace(/\n/g, eol)
      );
    }

    if (!await vscode.workspace.applyEdit(edit, {
      label: 'Dynamic7land wijziging'
    })) {
      throw new Error(
        'VS Code kon de wijziging niet uitvoeren.'
      );
    }

    const appliedVersion = doc.version;

    if (norm(doc.getText()) !== target) {
      throw new Error(
        'De inhoud is tijdens het aanpassen veranderd. ' +
        'Controleer het bestand in VS Code.'
      );
    }

    const onDisk = fs.readFileSync(job.file);

    const autoSaved =
      !doc.isDirty &&
      hash(norm(onDisk.toString('utf8'))) === hash(target);

    if (
      (!autoSaved && hash(onDisk) !== job.hash) ||
      doc.version !== appliedVersion
    ) {
      throw new Error(
        'Het bestand is tegelijkertijd aangepast. ' +
        'Dynamic7land heeft niet opgeslagen.'
      );
    }

    if (!autoSaved && !await doc.save()) {
      throw new Error(
        'De wijziging staat in VS Code, maar opslaan is mislukt. ' +
        "Your backup has been kept."
      );
    }

    if (doc.isDirty) {
      throw new Error(
        'Er zijn nieuwe wijzigingen in VS Code. ' +
        "Check the file."
      );
    }

    job.savedHash = hash(fs.readFileSync(job.file));

    const first = job.edits[0];

    const pos = doc.positionAt(rawOffset(
      doc.getText(),
      Math.min(first.start, norm(doc.getText()).length)
    ));

    editor.selection = new vscode.Selection(pos, pos);

    editor.revealRange(
      new vscode.Range(pos, pos),
      vscode.TextEditorRevealType.InCenterIfOutsideViewport
    );

    return {
      ok: true,
      savedHash: job.savedHash
    };
  }

  exports.activate = function activate(context) {
    context.subscriptions.push(
      vscode.window.registerUriHandler({
        handleUri(uri) {
          if (
            uri.authority !== 'jeevapilli.project-editor' ||
            uri.path !== '/connect'
          ) {
            return;
          }

          const params = new URLSearchParams(uri.query);
          const port = Number(params.get('port'));
          const token = params.get('token');
          const id = params.get('job');

          if (
            !Number.isInteger(port) ||
            port < 1024 ||
            port > 65535 ||
            !/^[a-f0-9]{64}$/.test(token || '') ||
            !/^[a-f0-9-]{36}$/.test(id || '')
          ) {
            return;
          }

          queue = queue.catch(() => {}).then(async () => {
            let claimed = false;
            let job;

            try {
              const data = await request(
                port,
                token,
                '/job/' + id
              );

              claimed = true;
              job = data.job;

              const title = job.kind === 'apply'
                ? 'Code aanpassen'
                : job.kind === 'restore'
                  ? 'Vorige versie herstellen'
                  : 'Bestand openen';

              const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
                title: 'Dynamic7land · ' + title
              }, () => run(port, token, job));

              await request(port, token, '/complete', {
                id,
                result
              });
            } catch (error) {
              const result = {
                ok: false,
                error: String(
                  error.message || 'De wijziging is mislukt.'
                ).slice(0, 700),
                savedHash: job?.savedHash || ''
              };

              if (claimed) {
                await request(port, token, '/complete', {
                  id,
                  result
                }).catch(() => {});
              }

              vscode.window.showWarningMessage(
                'Dynamic7land: ' + result.error
              );
            }
          });
        }
      })
    );
  };
})();
