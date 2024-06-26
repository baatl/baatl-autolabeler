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
    LOG_POINTS=image,label DRY_RUN=label node firehoseLabeler.js
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

Generate an app password for the labeler service in the app, and add it with login credentials to the labeler's environment file (here configured at `/ozone/labelers/baatl.env`):

```
BSKY_HANDLE=baatl.mastod.one
BSKY_PASSWORD=fak3-t3st-pa55-lm4o
```

(Any further environment variables to configure the autolabeler's behavior, such as `MINIMUM_FOLLOWERS` or `LOG_POINTS`, should be added to that environment file as well.)

Finally, run `sudo systemctl enable baatl-autolabeler/units/baatl-autolabeler.service` to enable the systemd unit for the service.
