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
    LOG_POINTS=post,image,label DRY_RUN=label node index.js
```
