# Imgix Palette Helper

Imgix Palette Helper is a small JavaScript library for working with the '?palette' parameter of imgix-served images.

More information about the '?palette' parameter can be found in imgix's [documentation](https://docs.imgix.com/apis/rendering/color-palette/palette).

## Installation
Download from this GitHub repository, extract the files, and place in the desired location. Then import using vanilla JavaScript using standard [ECMAScript import methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) or with npm's [install](https://docs.npmjs.com/cli/v8/commands/npm-install) <folder> command.


```bash
npm install --save <path-to-folder-containing-extracted-files>
```

## Usage

```javascript
import { getPalette, getTextColor, getCombo } from 'imgix-palette-helper'

const url = 'https://assets.imgix.net/examples/treefrog.jpg';

// returns an object containing a formatted palette from the given imgix-served image's '?palette' parameter.
palette = getPalette(url);

// returns an object containing two suitable colors for text overlaid on the given imgix-served image.
textColor = getTextColor(url);

// returns an object containing a combination of the output from the above methods.
paletteAndTextColor = getCombo(url);
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.


## License
[MPL 2.0](https://www.mozilla.org/en-US/MPL/2.0/)