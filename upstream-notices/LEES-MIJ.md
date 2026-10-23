# TwoCode Assistent — Island Monitor

Versie 1.1.0-beta.2 · eerste Windows-testversie

Deze versie voegt ChatGPT en Claude toe aan de Dynamic Island. Hij gebruikt een native Windows-koppeling, geen Chrome-extensie. Spotify, de ghost, instellingen en de bestaande Project-functie blijven aanwezig.

## Starten

1. Sluit de draaiende TwoCode-app met Ctrl+C in de terminal.
2. Pak de map `twocode-assistent-island` uit de zip uit in `C:\Users\levon`.
3. Dubbelklik op `START-TWOCODE.cmd` in die map. De eerste keer worden de npm-afhankelijkheden geïnstalleerd; daarna start de app.

Of gebruik PowerShell:

```powershell
cd C:\Users\levon\twocode-assistent-island
npm.cmd ci
npm.cmd start
```

Node.js en Windows PowerShell 5.1 moeten beschikbaar zijn. Er is voor de monitor geen extra API-key nodig. De bestaande Project-functie gebruikt nog de gekozen provider uit Instellingen → AI.

## Verbinden

1. Open ChatGPT of Claude in je browser of desktopapp en log daar in.
2. Bij een website: sleep het gesprekstabblad naar een eigen browservenster en laat dat venster open.
3. Klik in de island op ChatGPT of Claude → **Kies jouw venster**.
4. Kies het venster met jouw gesprek. **Ready** betekent dat het gesprek en het invoerveld zijn herkend.
5. Stel je opdracht in dat gesprek. Klik op **Klein** in TwoCode en werk verder in een andere app of een ander browservenster.

‘Verbinden’ koppelt een bestaand ingelogd venster. Het is geen OAuth-accountintegratie: TwoCode ontvangt geen accountwachtwoord of browsercookies. Inloggen gebeurt op de originele site of in de originele app.

## Stoplicht in de island

| Licht | Betekenis |
| --- | --- |
| Oranje knipperend | Bezig of antwoord aan het versturen |
| Oranje continu | Het laatste AI-antwoord bevat een herkende vraag |
| Rood | Gestopt, fout of verbinding niet meer leesbaar |
| Groen | Een nieuw antwoord is als afgerond herkend |
| Grijs | Ready, verbinden of niet verbonden |

Klik op het licht of de providernaam in de kleine island om de grote weergave te openen. Bij een vraag lees je het antwoord, typ je jouw reactie en klik je op **Verstuur**. Enter verstuurt; Shift+Enter maakt een nieuwe regel. Je antwoord wordt alleen naar het gekozen gesprek gestuurd.

Voor verzending worden het venster, proces, gesprek, vraag, berichtvolgorde en invoerveld opnieuw gecontroleerd. Bestaande concepttekst wordt niet overschreven. Een verzending zonder bevestiging wordt niet automatisch herhaald. Het gesprekvenster kan tijdens invoer kort naar voren komen als de app geen achtergrondinvoer ondersteunt.

Bij een herkende afgeronde reactie of vraag maakt TwoCode een Windows-melding. Klik erop om de juiste kaart in de island te openen. Windows-notificatie-instellingen kunnen meldingen onderdrukken.

## Grenzen van deze eerste versie

- Windows UI Automation moet de tekst en knoppen van het gekozen venster beschikbaar maken. De architectuur is niet aan Chrome gebonden; compatibiliteit verschilt per browser, appversie, taal en venstertoestand. Ondersteuning voor elke browser of desktopapp is nog niet bevestigd.
- Een gesloten venster of een gesloten gesprekstabblad kan niet gevolgd worden. Een ander tabblad in hetzelfde venster, een geminimaliseerd venster of een vergrendelde pc kan de inhoud onleesbaar maken. TwoCode meldt dat in rood; dit betekent niet dat de AI zelf zeker is gestopt. Gebruik een eigen open gesprekvenster.
- Een herkende vraag is gebaseerd op het laatste AI-antwoord en een vragende eindzin. Dit is geen officiële ‘wacht op gebruiker’-status van ChatGPT of Claude. Voorbeelden of anders geformuleerde vragen kunnen nog verkeerd herkend worden.
- Het groene licht bevestigt het einde van een waarneembaar antwoord. Dat is geen bewijs dat een externe agent al zijn achterliggende taken heeft uitgevoerd. De monitor kijkt naar de interface van het gekozen gesprek.
- Er verschijnt geen verzonnen percentage. Tijdens werk zie je een bewegende balk, activiteit indien herkenbaar en de verstreken tijd sinds TwoCode het werk opmerkte.
- Bij lange gesprekken of ontbrekende herkenbare elementen stopt automatische interpretatie. Open een kort gesprek om de eerste koppeling te testen. Een niet-ondersteunde verzendknop kan betekenen dat je de reactie in de originele app moet verzenden.

De statuslogica, IPC, verzendcontrole en island-integratie zijn getest met gesimuleerde Windows-gegevens. De renderer is gecontroleerd met een DOM/canvas-test. De bestaande editor-flow is gecontroleerd met tijdelijke bestanden en gesimuleerde VS Code/API-verbindingen. De C#/PowerShell-koppeling, echte ChatGPT/Claude-interfaces en Windows-meldingen konden niet op een Windows-pc worden getest in deze ontwikkelomgeving. Visuele controle in een echte browser was hier niet beschikbaar. Test deze versie daarom eerst in de nieuwe map.

## Als verbinden niet lukt

1. Open het juiste gesprek zichtbaar in een eigen venster; controleer of je bent ingelogd.
2. Kies opnieuw **Kies jouw venster** → **Vernieuwen**.
3. Dubbelklik op `CONTROLE-WINDOWS.cmd`, of test de Windows-koppeling met:

```powershell
npm.cmd run check:windows
```

De controle toont per AI-venster of het invoerveld, het laatste AI-bericht en afrondingsknoppen herkenbaar zijn. Gespreksinhoud, venstertitels en accountgegevens worden niet afgedrukt. Andere browservensters worden overgeslagen.

Als de Windows-koppeling niet kan starten, staat de technische oorzaak onder `[TwoCode monitor]` in de terminal. Instellingswijzigingen aan beveiliging zijn geen onderdeel van deze zip. Stuur de foutmelding om de echte oorzaak te onderzoeken.

## Bestaande app

De pakketnaam is behouden. Daardoor blijven instellingen en bestaande Spotify-tokens in de gebruikelijke Electron-gebruikersmap beschikbaar. Deze zip bevat zelf geen accounts, keys of tokens.

De bestaande Project-functie is behouden; de eerder besproken nieuwe coding-agent is niet opgenomen. De bestaande VS Code-extensie staat onder `vscode-editor` voor het geval deze opnieuw nodig is:

```powershell
code --install-extension .\vscode-editor\twocode-project-editor.vsix --force
```

## Opgeschoond

Weggelaten: `node_modules`, oude `enable-*`/`fix-*`/`prepare-*` installers, oude backups, caches, ongebruikte voorbeeldpagina's en de ongebruikte Three.js-afhankelijkheid. De bronbestanden die de huidige runtime nodig heeft zijn behouden. De originele appmap wordt niet door deze zip verwijderd.

De centrale AI-instellingen en de website-monitor zijn afzonderlijke functies: **ChatGPT in Instellingen → AI** is de bestaande Codex/provider-login. **ChatGPT op het homescherm** is deze nieuwe venster-monitor.

Automatische controles:

```powershell
npm.cmd test
```

Technische basis: [Microsoft UI Automation](https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-uiautomationoverview), [Control patterns](https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-controlpatternsoverview), [Chromium UIA](https://developer.chrome.com/blog/windows-uia-support-update).

## Wijzigingen in beta.2

De verbindingsstap heet nu “Verbind jouw gesprek”, omdat je een bestaand venster kiest. De uitleg in de island vermeldt dat het gesprek open moet blijven. De Windows-controle controleert nu ook herkenning van de AI-interface, in plaats van alleen de aanwezigheid van vensters.
