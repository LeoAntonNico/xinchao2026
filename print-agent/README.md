# Xin Chao Windows Print Agent

Deze agent draait op de Windows-pc in de vestiging en print betaalde orders naar de lokale Epson TM-T20III.

## Installatie per locatie

1. Installeer Node.js LTS op de Windows-pc.
2. Kopieer de map `print-agent` naar de pc.
3. Kopieer `.env.example` naar `.env`.
4. Vul `.env` in:

```env
XINCHAO_BASE_URL=https://jouw-live-site.nl
XINCHAO_PRINT_SECRET=dezelfde-secret-als-op-de-server
XINCHAO_LOCATION=utrecht
XINCHAO_TRANSPORT=tcp
XINCHAO_PRINTER_HOST=192.168.1.50
XINCHAO_PRINTER_PORT=9100
```

Voor Wageningen:

```env
XINCHAO_LOCATION=wageningen
```

## Printer aansluiten

### Optie A: Epson via netwerk

Gebruik `XINCHAO_TRANSPORT=tcp`.

De printer moet een vast IP-adres hebben. De meeste Epson TM-T20III printers luisteren op poort `9100`.

### Optie B: USB-printer via Windows share

Gebruik `XINCHAO_TRANSPORT=share`.

1. Installeer de Epson driver.
2. Deel de printer in Windows.
3. Zet de share path in `.env`:

```env
XINCHAO_TRANSPORT=share
XINCHAO_PRINTER_SHARE=\\RESTAURANT-PC\EPSON-TM-T20III
```

## Handmatig testen

Open PowerShell in deze map:

```powershell
node .\agent.mjs
```

Queue daarna in admin een testbon via `/admin/print`.

## Automatisch starten na reboot

Open PowerShell als Administrator:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\install-task.ps1
```

Verwijderen:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\uninstall-task.ps1
```

## Logs

Standaard:

```text
print-agent/logs/print-agent.log
```

## Hoe het werkt

1. Mollie webhook zet een order op betaald.
2. De website maakt een `PrintJob` voor de juiste locatie.
3. Deze agent vraagt elke paar seconden jobs op voor `XINCHAO_LOCATION`.
4. De agent stuurt de ESC/POS bytes naar de printer.
5. De agent markeert de job als `PRINTED`, `RETRYING` of `FAILED`.
