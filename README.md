# baatl-autolabeler

Automatic labeling for the Bad Accessibility / Alt Text Labeler service

## Building

```sh
npm install
```

## Testing

Generate an [App Password](https://bsky.app/settings/app-passwords):

```sh
BSKY_HANDLE=baatl.mastod.one BSKY_PASSWORD=fak3-t3st-pa55-lm4o \
    LOG_POINTS=image,label DRY_RUN=label node index.js
```

## Deploying

You may wish to implement a containerized version of this script: this is not currently implemented, as the production implementation is simple enough to run directly.

### Prerequisites

Make sure you have a reasonably recent version of Node.js installed. On Ubuntu 22.04:

```
curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs
```

### Setup

From the working directory where you plan to store the script (the systemd unit in the next section assumes `/ozone/auto`):

```
sudo sh '
git clone https://github.com/baatl/baatl-autolabeler.git
cd baatl-autolabeler
npm install'
```

### Configuration

Generate an app password for the labeler service in the app, and replace "fak3-t3st-pa55-lm4o" with that password when running this command:

```
cat <<SYSTEMD_UNIT_FILE | sudo tee /etc/systemd/system/baatl-autolabeler.service
[Unit]
Description=BAATL Auto-Labeler
Documentation=https://github.com/baatl/baatl-autolabeler
After=network.target
StartLimitIntervalSec=500
StartLimitBurst=5

[Service]
ExecStart=/usr/bin/node /ozone/auto/baatl-autolabeler/index.js
Restart=on-failure
Environment=BSKY_HANDLE=baatl.mastod.one
Environment=BSKY_PASSWORD=fak3-t3st-pa55-lm4o

[Install]
WantedBy=default.target
SYSTEMD_UNIT_FILE
```