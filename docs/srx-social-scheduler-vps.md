# SRX Social Scheduler on VPS

This scheduler publishes due SRX news posts to Facebook and Zalo OA.

It runs internally with:

```bash
npm run srx:social-scheduler -- --limit=20
```

The command uses a MySQL advisory lock named `srx_news_social_scheduler`, so overlapping timer runs will skip safely.

## systemd service

Create `/etc/systemd/system/srx-social-scheduler.service`:

```ini
[Unit]
Description=SRX news social scheduler
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/var/www/crm-eac
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run srx:social-scheduler -- --limit=20
```

Update `WorkingDirectory` to the actual app path on the VPS.

## systemd timer

Create `/etc/systemd/system/srx-social-scheduler.timer`:

```ini
[Unit]
Description=Run SRX news social scheduler every 5 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
AccuracySec=30s
Persistent=true
Unit=srx-social-scheduler.service

[Install]
WantedBy=timers.target
```

## Enable

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now srx-social-scheduler.timer
```

## Check

```bash
systemctl list-timers srx-social-scheduler.timer
sudo systemctl status srx-social-scheduler.timer
sudo journalctl -u srx-social-scheduler.service -n 100 --no-pager
```

## Manual run

```bash
cd /var/www/crm-eac
npm run srx:social-scheduler -- --limit=20
```
