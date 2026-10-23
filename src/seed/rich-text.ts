/**
 * A Lexical document from lightly marked-up text: paragraphs separated by a
 * blank line, `## ` for an H3 (H2 is the page's own section headings), and
 * consecutive `- ` lines for a bulleted list. Enough for the seed content;
 * anything richer is edited in the CMS.
 */
export function richText(text: string) {
  const textNode = (value: string) => ({
    type: 'text',
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text: value,
    version: 1,
  })
  const block = (chunk: string) => {
    if (chunk.startsWith('## ')) {
      return {
        type: 'heading',
        tag: 'h3',
        format: '',
        indent: 0,
        version: 1,
        direction: null,
        children: [textNode(chunk.slice(3).trim())],
      }
    }
    if (chunk.startsWith('- ')) {
      return {
        type: 'list',
        listType: 'bullet',
        tag: 'ul',
        start: 1,
        format: '',
        indent: 0,
        version: 1,
        direction: null,
        children: chunk.split('\n').map((line, index) => ({
          type: 'listitem',
          value: index + 1,
          format: '',
          indent: 0,
          version: 1,
          direction: null,
          children: [textNode(line.replace(/^- /, '').trim())],
        })),
      }
    }
    return {
      type: 'paragraph',
      format: '',
      indent: 0,
      version: 1,
      direction: null,
      textFormat: 0,
      children: [textNode(chunk)],
    }
  }
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: null,
      children: text
        .split('\n\n')
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map(block),
    },
  }
}
