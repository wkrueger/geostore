export function trimDocs(str: string) {
  let split = str.split(/\n/g);
  if (split[0].trim().length === 0) {
    split = split.slice(1);
  }
  let spacesTemp = split[0].match(/^(\s+)/g) || [];
  let spaces = spacesTemp[0].length;
  split = split.map(line => line.substr(spaces));
  return split.join('\n');
}
