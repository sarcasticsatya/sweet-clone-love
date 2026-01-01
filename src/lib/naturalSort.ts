/**
 * Natural sort comparator for alphanumeric chapter numbers
 * Handles: 1, 1a, 1b, 2, 10, 11, etc.
 */
export const naturalSortChapters = <T extends { chapter_number: string }>(
  a: T,
  b: T
): number => {
  const chunkify = (str: string): (string | number)[] => {
    const chunks: (string | number)[] = [];
    let currentChunk = '';
    let isNumeric = false;

    for (const char of str) {
      const charIsNumeric = /\d/.test(char);
      
      if (currentChunk === '') {
        currentChunk = char;
        isNumeric = charIsNumeric;
      } else if (charIsNumeric === isNumeric) {
        currentChunk += char;
      } else {
        chunks.push(isNumeric ? parseInt(currentChunk, 10) : currentChunk.toLowerCase());
        currentChunk = char;
        isNumeric = charIsNumeric;
      }
    }
    
    if (currentChunk) {
      chunks.push(isNumeric ? parseInt(currentChunk, 10) : currentChunk.toLowerCase());
    }
    
    return chunks;
  };

  const chunksA = chunkify(a.chapter_number);
  const chunksB = chunkify(b.chapter_number);

  for (let i = 0; i < Math.max(chunksA.length, chunksB.length); i++) {
    const partA = chunksA[i];
    const partB = chunksB[i];

    if (partA === undefined) return -1;
    if (partB === undefined) return 1;

    if (typeof partA === 'number' && typeof partB === 'number') {
      if (partA !== partB) return partA - partB;
    } else if (typeof partA === 'string' && typeof partB === 'string') {
      if (partA !== partB) return partA.localeCompare(partB);
    } else {
      // Number vs string: numbers come first
      return typeof partA === 'number' ? -1 : 1;
    }
  }

  return 0;
};
