exports.urlCleaner = (url) => {
  const linkWithoutParams = url?.split("?")[0]
  const linkWithoutHash = linkWithoutParams?.split("#")[0]
  return linkWithoutHash[linkWithoutHash.length - 1] === '/' ? linkWithoutHash.slice(0, -1) : linkWithoutHash
}