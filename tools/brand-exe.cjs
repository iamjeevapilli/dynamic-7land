'use strict';
const fs = require('node:fs');
async function brand(input, output, icon) {
  const R = await import('resedit');
  if (input === output) throw new Error('Use separate input and output executables.');
  const exe = R.NtExecutable.from(fs.readFileSync(input), { ignoreCert: true });
  const resources = R.NtExecutableResource.from(exe);
  const icons = R.Data.IconFile.from(fs.readFileSync(icon)).icons.map(item => item.data);
  for (const group of R.Resource.IconGroupEntry.fromEntries(resources.entries)) {
    R.Resource.IconGroupEntry.replaceIconsForResource(resources.entries, group.id, group.lang, icons);
  }
  for (const version of R.Resource.VersionInfo.fromEntries(resources.entries)) {
    for (const language of version.getAllLanguagesForStringValues()) {
      version.setFileVersion(1, 1, 0, 0, language.lang);
      version.setProductVersion(1, 1, 0, 0, language.lang);
      version.setStringValues(language, { CompanyName: 'Jeeva Pilli', ProductName: 'Dynamic 7land', FileDescription: 'Dynamic 7land Desktop Companion', InternalName: 'Dynamic7land', OriginalFilename: 'Dynamic7land.exe' });
    }
    version.outputToResourceEntries(resources.entries);
  }
  resources.outputResource(exe);
  fs.writeFileSync(output, Buffer.from(exe.generate()));
}
module.exports = { brand };
if (require.main === module) {
  const [input, output, icon] = process.argv.slice(2);
  if (!input || !output || !icon) throw new Error('Usage: node tools/brand-exe.cjs input.exe output.exe icon.ico');
  brand(input, output, icon).catch(error => { console.error(error); process.exitCode = 1; });
}
