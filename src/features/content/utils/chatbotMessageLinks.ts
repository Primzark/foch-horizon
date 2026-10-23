const internalPathSplitPattern = /(?<![\p{L}\p{N}_:/.-])(\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:\?[a-z0-9=&_-]+)?)/giu;
const internalPathMatchPattern = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:\?[a-z0-9=&_-]+)?$/i;

export function splitChatbotMessageContent(content: string): string[] {
  return content.split(internalPathSplitPattern);
}

export function isStandaloneInternalPath(segment: string): boolean {
  return internalPathMatchPattern.test(segment.trim());
}
