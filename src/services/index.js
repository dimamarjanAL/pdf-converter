const libre = require("libreoffice-convert");
const util = require("util");
const convert = util.promisify(libre.convert);

exports.converter = async ({ file }) => {
  const buffer = file?.buffer;
  const extend = ".pdf";

  if (!buffer) {
    return { buffer: null, error: "no file loaded" };
  }

  try {
    const convertedBuffer = await convert(buffer, extend, undefined);
    return { buffer: convertedBuffer, error: null };
  } catch (err) {
    console.log(`Error converting file: ${err}`);
    return { buffer: null, error: err?.message || "something went wrong" };
  }
};
