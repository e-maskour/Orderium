# Orderium Print Agent

Prints Orderium receipts and documents on shop hardware.

## Why this exists

A web page cannot talk to a printer. Browsers run pages in a sandbox with no
raw sockets and no USB, and a page served over `https://` may never call a
printer's plain `http://` LAN endpoint — the mixed-content rule blocks it with
no override. Every "silent printing" trick around this either fails under
HTTPS, needs a paid certificate, or only helps the one machine it is installed
on.

So printing moves out of the browser. The browser queues a job through the
normal API; this agent, running on a machine inside the shop, claims the job
and drives the device.

```
Any device (PC, tablet, phone)        Shop counter machine
   POST /print-jobs  ─────────►  API  ─────SSE────►  print-agent ──► printer
```

A waiter's phone can trigger a receipt on the counter printer, which is
impossible when the browser has to reach the hardware itself.

## What it does and does not do

The agent is a transport. It contains **no receipt formatting and no document
rendering** — the API produces the finished bytes. A change to receipt layout
is an API deploy, not a visit to every shop.

## Requirements

- Node.js 20 or newer
- Network access to your Orderium API over HTTPS
- For network printers: TCP port 9100 reachable on the shop LAN
- For USB / A4 printers: the printer installed as an OS print queue

## Install

Build first:

```bash
pnpm install
pnpm build      # produces dist/
```

### Windows

```powershell
# Run PowerShell as Administrator
.\service\install-windows.ps1 `
  -InstallDir 'C:\Program Files\OrderiumPrintAgent' `
  -ApiUrl 'https://api.yourdomain.com' `
  -PairingCode 'yourtenant-4F7K2Q9X'
```

Registers a boot-time scheduled task that restarts on failure. No service
wrapper and no native modules are required.

### Linux (systemd)

```bash
sudo mkdir -p /opt/orderium-print-agent
sudo cp -r dist package.json /opt/orderium-print-agent/
sudo useradd -r -s /bin/false orderium 2>/dev/null || true
sudo -u orderium node /opt/orderium-print-agent/dist/index.js pair \
  --url https://api.yourdomain.com --code yourtenant-4F7K2Q9X
sudo cp service/orderium-print-agent.service /etc/systemd/system/
sudo systemctl enable --now orderium-print-agent
```

The agent must run as the user that owns the CUPS queues, or `lp` will refuse.

### macOS (launchd)

```bash
sudo mkdir -p /usr/local/opt/orderium-print-agent
sudo cp -r dist package.json /usr/local/opt/orderium-print-agent/
node /usr/local/opt/orderium-print-agent/dist/index.js pair \
  --url https://api.yourdomain.com --code yourtenant-4F7K2Q9X
sudo cp service/com.orderium.printagent.plist /Library/LaunchDaemons/
sudo launchctl load /Library/LaunchDaemons/com.orderium.printagent.plist
```

## Getting a pairing code

In the backoffice: **Settings → Printers → Agents → Add agent**. Choose the
warehouse the machine sits in. You get a string like `yourtenant-4F7K2Q9X`.

The tenant prefix is how the agent knows which tenant to talk to, so there is
nothing else to configure.

**Codes are single-use and expire after 15 minutes.** Generate one when you are
at the machine, not before.

## Where things live

| | Windows | Linux | macOS |
| --- | --- | --- | --- |
| Config | `%USERPROFILE%\.orderium-print-agent\config.json` | `~/.orderium-print-agent/config.json` | same as Linux |
| Logs | Task Scheduler history | `journalctl -u orderium-print-agent -f` | `/usr/local/var/log/orderium-print-agent.log` |

The config file holds a long-lived key and is written `0600`. Bearer tokens are
redacted from logs, but treat the config file as a secret.

## Is it working?

A healthy agent logs on start:

```
Orderium print agent 1.0.0 on win32
Tenant yourtenant, warehouse 1
Job stream connected
```

In the backoffice, **Settings → Printers → Agents** shows a green dot when a
heartbeat arrived in the last 90 seconds.

## Troubleshooting

**`Pairing failed: 401 Invalid or expired pairing code`**
The code was already used or is over 15 minutes old. Generate a fresh one.

**`Printer did not respond within 5000ms`**
The agent reached the network but not the printer. Check the IP in Settings →
Printers, confirm the printer is on, and that port 9100 is not firewalled.
Test from the shop machine: `Test-NetConnection <ip> -Port 9100` (Windows) or
`nc -vz <ip> 9100` (Linux/macOS).

**`Printer has no systemName`**
A USB or A4 printer is addressed by its OS queue name, not an IP. Put the exact
queue name in Settings → Printers → System name. Find it with `Get-Printer`
(Windows) or `lpstat -p` (Linux/macOS).

**Jobs stay queued and nothing prints**
Check the agent is running and its warehouse matches the printer's. An agent
only ever sees jobs for its own warehouse.

**A job says "may have printed — retry manually"**
The agent died after sending bytes to the device. The server will never retry
this automatically, because the paper may already be out. Check the printer,
then use Retry in the backoffice if nothing came out.
