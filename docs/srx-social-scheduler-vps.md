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

## Debug when scheduled posts do not publish

First check whether the timer is actually enabled:

```bash
systemctl list-timers srx-social-scheduler.timer
sudo systemctl status srx-social-scheduler.timer
sudo systemctl status srx-social-scheduler.service
sudo journalctl -u srx-social-scheduler.service -n 100 --no-pager
```

Then run a safe status check. This does not publish anything:

```bash
cd /var/www/crm-eac
npm run srx:social-scheduler -- --status --limit=20
```

Expected output:

- `scheduledTotal > 0`: there are published posts waiting for Facebook/Zalo.
- `dueTotal > 0`: there are posts whose `published_at` is already due and should publish on the next real run.
- `dueTotal = 0`: no post currently matches the scheduler conditions.

The scheduler only publishes rows matching all of these conditions:

- `status = 'published'`
- `published_at IS NOT NULL`
- `published_at <= appNow`
- `social_publish_facebook = 1` with empty `id_fb_post`, or `social_publish_zalo = 1` with empty `id_zalo_post`

Run one real cycle manually:

```bash
cd /var/www/crm-eac
npm run srx:social-scheduler -- --limit=20
```

If this publishes successfully but automatic publishing does not, the problem is systemd timer setup. If this returns failed posts, inspect the error message in the JSON output.
