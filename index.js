/*
* Handles getting the raw palette data from a given imgix-served image
*/
async function fetchRawPalette(url) {
	const response = await fetch(url + '?palette=json');

	if (response.ok) {
		const rawPalette = await response.json();
		return rawPalette;
	} else {
		return false;
	}
}


/*
* These are 'helper' functions that are used in multiple places
* by the functions which format the rawPalette
*/

/*
*	Converts rgb float values (0-1), to 8bit rgb values (0-255).
* Converts one channel at a time. 
* E.g. rgbColor = { red: floatTo8bit(redFloatValue), green: floatTo8bit(greenFloatValue), blue: floatTo8bit(blueFloatValue) }
* Conversion can be accomplished by multiplying by either 255 or 256, 
* but 255 was chosen in consideration of the points made in these posts:
* https://stackoverflow.com/questions/1914115/converting-color-value-from-float-0-1-to-byte-0-255/46575472#46575472
* https://stackoverflow.com/questions/1914115/converting-color-value-from-float-0-1-to-byte-0-255/66862750#66862750
*/
function floatTo8bit(colorChannelFloat) {
	return Math.round(colorChannelFloat * 255);
}

/*
* Small function to convert an object containing rgb int (8bit) values to a css readable string.
* E.g. cssString = rgbToCss( { red: redIntValue, green: greenIntValue, blue: blueIntValue } )
*/
function rgbToCss(intRgb) {
	return "rgb(" + intRgb.red + " " + intRgb.green + " " + intRgb.blue + ")";
}

/*
* Converts an object containing rgb int (8bit) values to hex format.
* E.g. colorHexValue = rgbToHex( { red: redIntValue, green: greenIntValue, blue: blueIntValue } )
*/
function rgbToHex(intRgb) {
	return "#" + Object.values(intRgb).reduce((previousValue, currentValue) => {
		const currentHex = currentValue.toString(16);
		return previousValue + (currentHex.length === 1 ? "0" + currentHex : currentHex);
	}, '');
}

/*
* Returns the perceptual luminance value of an object containing rgb float (0-1) values.
* E.g. perceptualLuminance = perceptualLumin( { red: redFloatValue, green: greenFloatValue,  blue: blueFloatValue } )
* From https://gist.github.com/Myndex/e1025706436736166561d339fd667493
*/
function perceptualLumin(rgbFloat) {
	return Math.pow(
		(
			(Math.pow(rgbFloat.red, 2.2) * 0.2126) +
			(Math.pow(rgbFloat.green, 2.2) * 0.7152) +
			(Math.pow(rgbFloat.blue, 2.2) * 0.0722)
		), 0.6);
}

/*
* Given an array of luminance values, returns "light", "dark", or "multi" if
* the majority of luminance values are "light" (value > 0.5), "dark" (value < 0.5)
* or "multi" if there are an equal number of "light" and "dark" values
* E.g. luminMode = findLuminMode( [ 0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.85, 0.9 ] )
* would return "light", because over 50% of the array values are greater than 0.5
*/
function findLuminMode(luminArray) {
	const halfArray = ( luminArray.length / 2)
	const totalLight = luminArray.reduce((totalLight, color) => {
		return totalLight + (color > 0.5 ? 1 : 0);
	}, 0);
	if (totalLight != halfArray) {
		return (totalLight > halfArray ? 'light' : 'dark');
	} else {
		return 'multi'
	}
}

/*
* End of "helper" functions
*/


/*
* Functions that return a formatted "palette" object from the "rawPalette" received from
* the response of an imgix-served image's "?palette=json" parameter
*/

/*
* This function is a collection of the functions required to build a complete "palette"
* out of a "rawPalette" input.
*/
function imgixPalette(rawPalette) {
	let palette = {};
	palette.hex = setHex(rawPalette.colors);
	palette.rgb = setRgb(rawPalette.colors);

	const dominantColors = setDominant(rawPalette.dominant_colors);
	palette.hexDominant = dominantColors.hex;
	palette.rgbDominant = dominantColors.rgb;
	
	return palette;
}

/*
* Returns an array of all the hex values from an array of objects containing "hex" properties
* (it is assumed that the given objects' "hex" properties are associated with a valid hex value)
*/
function setHex(colors) {
	return colors.map((color) => {
		return color.hex;
	});
}

/*
* Given an array of objects containing float rgb values, 
* returns an array of objects containing int rgb values (8bit) and a css readable string of those values
*/
function setRgb(colors) {
	return colors.map((color) => {
		const red = floatTo8bit(color.red);
		const green = floatTo8bit(color.green);
		const blue = floatTo8bit(color.green);
		return {
			css: rgbToCss({red: red,  green: green, blue: blue}),
			red: red,
			green: green,
			blue: blue,
		};
	});
}

/*
* Given an object of named "dominant color" objects,
* returns an object containing a "hexDominant" object and "rgbDominant" Object.
* Each of which are an object of objects structured as follows:
* hexDominant = { vibrant: { vibrantHexValue }, muted: { mutedHexValue },... }
* rgbDominant = { 
*		vibrant: { css: cssRgbString, red: redIntValue, green: greenIntValue, blue: blueIntValue },
*		muted: { css: cssRgbString, red: redIntValue, green: greenIntValue, blue: blueIntValue },... 
*	}
*/
function setDominant(dominantColors) {
	let hexDominant = {};
	let rgbDominant = {};

	for (const color of Object.keys(dominantColors)) {
		hexDominant[color] = dominantColors[color].hex;
		const red = floatTo8bit(dominantColors[color].red);
		const green = floatTo8bit(dominantColors[color].green);
		const blue = floatTo8bit(dominantColors[color].blue);
		rgbDominant[color] = {
			css: rgbToCss({red: red,  green: green, blue: blue}),
			red: red,
			green: green,
			blue: blue,
		};
	}

	return {hex: hexDominant, rgb: rgbDominant};
}

/*
* End of "palette" functions
*/


/*
* Functions that return a "textColor" object containing two objects of suitable colors for 
* text overlaid on the given imgix-served image.
* One color object is "colorful" and contains values for a color based on the color palette of the given image.
* One color object is "monochrome" and contains values for either black or white text.
*/

/*
* This function is a collection of the functions required 
* to build the "textColor" object described above.
*/
function imgixTextColor(rawPalette) {
	let textColor = {};

	textColor.colorful = setTextColorful(rawPalette.colors);
	textColor.monochrome = setTextMonochrome(rawPalette.colors);

	return textColor;
}

/*
* Returns the "colorful" text color object described above.
* First "accumulates" the total red, green, and blue channel values of each color in the given palette.
* E.g. accumulatedChannels = [ 
*		(color1.red + color2.red + color3.red), 
*		(color1.green + color2.green + color3.green), 
*		(color1.blue + color2.blue + color3.blue) 
*	]
* This used to determine the "channelBiasValue" and "channelBiasKey", 
* i.e. whether all the colors given tend towards red, green, or blue tones.
* Then the "dominantBiasColor" is determined by finding the first color in the given set that 
* has a channel value greater than or equal to the average value of the set's "channelBiasKey".
* That "dominantBiasColor" is then inverted to produce a color that, in theory, should have 
* a good amount of contrast against the colors in the given set.
* This function does not take into account perceptual luminance values, and does not take into account
* the total number of red, green, or blue biased tones in the set. 
* It purely operates on the average tonal bias of the set as a whole.
*/
function setTextColorful(colors) {
	const colorsLength = colors.length
	const accumulatedChannels = colors.reduce((channelsTotal, currentColor) => {
		return {
			red: channelsTotal.red + currentColor.red,
			green: channelsTotal.green + currentColor.green,
			blue: channelsTotal.blue + currentColor.blue
		};
	}, {red: 0, green: 0, blue: 0});

	const channelBiasValue = Math.max(accumulatedChannels.red, accumulatedChannels.green, accumulatedChannels.blue);
	const channelBiasKey = Object.keys(accumulatedChannels).find(key => accumulatedChannels[key] === channelBiasValue);
	const averageBiasValue = accumulatedChannels[channelBiasKey] / colorsLength;
	const dominantBiasColor = colors.find(color => color[channelBiasKey] >= averageBiasValue);
	const invertDomBiasColor = {
		red: 255 - floatTo8bit(dominantBiasColor.red),
		green: 255 - floatTo8bit(dominantBiasColor.green),
		blue: 255 - floatTo8bit(dominantBiasColor.blue)
	};

	return {
		css: rgbToCss({red: invertDomBiasColor.red,  green: invertDomBiasColor.green, blue: invertDomBiasColor.green}),
		red: invertDomBiasColor.red,
		green: invertDomBiasColor.green,
		blue: invertDomBiasColor.blue,
		hex: rgbToHex(invertDomBiasColor)
	};
}

/*
* Returns an object containing values for either black or white, 
* depending on whether the given set of colors contains more colors with high luminance (returns the "textDark" object),
* or low luminance (returns the "textLight" object). 
*/
function setTextMonochrome(colors) {
	const textLight = {
		css: "rgb(255 255 255)",
		red: 255,
		green: 255,
		blue: 255,
		hex: "#ffffff"
	};

	const textDark = {
		css: "rgb(0 0 0)",
		red: 0,
		green: 0,
		blue: 0,
		hex: "#000000"
	};

	const colorsLumin = colors.map((color) => {
		return perceptualLumin(color);
	});

	const luminMode = findLuminMode(colorsLumin);

	switch(luminMode) {
		case 'dark':
			return textLight;
		case 'light':
			return textDark;
		default:
			const favoredLumins = colorsLumin.slice(0, Math.ceil(colors.length /2));
			const favoredMode = findLuminMode(favoredLumins);

			switch(favoredMode) {
				case 'dark':
					return textLight;
				case 'light':
					return textDark;
				default:
					return favoredLumins[0] > 0.5 ? textDark : textLight;
			}
	}
}

/*
* End of "textColor" functions
*/


/*
* These functions are the exposed entry point to all the functions above.
* "getPalette" returns a formatted palette of colors from a given imgix-served image.
* "getTextColor" returns an object containing two objects of suitable colors for 
*	text overlaid on a given imgix-served image.
* "getCombo" returns an object containing both the formatted palette and 
* suitable text overlay colors described above.
*
* Each must be supplied with a valid url for an imgix-served image.
* 
* It is assumed that the user of this package will be able to supply valid imgix-served image urls.
* Because of this, no validation of the supplied url is performed.
*	Supplying other urls may have unpredictable results.
*
* Each returns null if the intitial fetch query of the provided url fails.
*/


async function getPalette(url) {
	const rawPalette = await fetchRawPalette(url);
	if (rawPalette != false) {
		return imgixPalette(rawPalette);
	} else {
		return null;
	}

}

async function getTextColor(url) {
	const rawPalette = await fetchRawPalette(url);
	if (rawPalette != false) {
		return imgixTextColor(rawPalette);
	} else {
		return null;
	}
}

async function getCombo(url) {
	const rawPalette = await fetchRawPalette(url);
	if (rawPalette != false) {
		let resultCombo = {};
		resultCombo.palette = imgixPalette(rawPalette);
		resultCombo.textColor = imgixTextColor(rawPalette);
		return resultCombo;
	} else {
		return null;
	}
}


export {getPalette, getTextColor, getCombo};


