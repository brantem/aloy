const unitsSlice = 'kmgtp';

// https://github.com/gofiber/utils/blob/7349198c11be5e88d6650b68bd9d627c5fc5982c/common.go#L119
export function convertToBytes(humanReadableString: string): number {
  const strLen = humanReadableString.length;
  if (strLen === 0) return 0;

  let unitPrefixPos = -1;
  let lastNumberPos = -1;

  // loop the string
  for (let i = strLen - 1; i >= 0; i--) {
    // check if the char is a number
    if (/^\d$/.test(humanReadableString[i])) {
      lastNumberPos = i;
      break;
    } else if (humanReadableString[i] !== ' ') {
      unitPrefixPos = i;
    }
  }

  // fetch the number part and parse it to float
  const size = parseFloat(humanReadableString.slice(0, lastNumberPos + 1));
  if (isNaN(size)) return 0;

  // check the multiplier from the string and use it
  if (unitPrefixPos > 0) {
    // convert multiplier char to lowercase and check if exists in units slice
    const index = unitsSlice.indexOf(humanReadableString[unitPrefixPos].toLowerCase());
    if (index !== -1) return Math.trunc(size * Math.pow(1000, index + 1));
  }

  return Math.trunc(size);
}
