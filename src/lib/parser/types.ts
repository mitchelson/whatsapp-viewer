export type MediaKind = 'image' | 'sticker' | 'video' | 'audio' | 'doc';

export type MessageType = 'text' | 'system' | 'media' | 'omitted' | 'deleted';

export interface Media {
  name: string;
  kind: MediaKind;
}

export interface Message {
  id: number;
  /** Unix epoch in ms, interpreted as local time of the export. */
  ts: number;
  /** Index into `ParsedChat.authors`, -1 for system messages. */
  author: number;
  type: MessageType;
  text: string;
  /** Lowercased text without diacritics, used for search. */
  norm: string;
  media?: Media;
  edited?: boolean;
}

export interface ParsedChat {
  messages: Message[];
  authors: string[];
  /** Messages sent per author (same order as `authors`). */
  counts: number[];
  dateOrder: 'DMY' | 'MDY' | 'YMD';
}
