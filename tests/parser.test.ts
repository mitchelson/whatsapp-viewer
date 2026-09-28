import { describe, expect, it } from 'vitest';
import { chatNameFromFile, normalizeForSearch, parseChat } from '../src/lib/parser/parse';

const LRM = '\u200e';
const NNBSP = '\u202f';

const androidPt = [
  '28/09/2026 09:40 - As mensagens e ligações são protegidas com a criptografia de ponta a ponta.',
  '28/09/2026 09:45 - João Silva: Bom dia!',
  '28/09/2026 09:46 - Maria: Oi João',
  'tudo bem?',
  'segunda linha',
  '28/09/2026 09:47 - João Silva: IMG-20260928-WA0001.jpg (arquivo anexado)',
  'legenda da foto',
  '28/09/2026 09:48 - Maria: <Mídia oculta>',
  '28/09/2026 09:49 - João Silva: Esta mensagem foi apagada',
  '28/09/2026 09:50 - Maria: Texto corrigido <Mensagem editada>',
  '13/10/2026 18:05 - João Silva: PTT-20261013-WA0003.opus (arquivo anexado)',
  '13/10/2026 18:06 - Maria: STK-20261013-WA0004.webp (arquivo anexado)',
].join('\n');

const iosPt = [
  `${LRM}[28/09/2026, 09:40:01] Ana: ${LRM}As mensagens e ligações são protegidas com a criptografia de ponta a ponta.`,
  '[28/09/2026, 09:45:12] Ana: Olá!',
  `${LRM}[28/09/2026, 09:46:00] Bruno: ${LRM}<anexado: 00000012-PHOTO-2026-09-28-09-46-00.jpg>`,
  `${LRM}[28/09/2026, 09:47:00] Ana: ${LRM}imagem ocultada`,
  '[28/09/2026, 09:48:00] Bruno: Linha 1',
  'Linha 2',
].join('\n');

const iosEn12h = [
  `[9/28/26, 9:45:12${NNBSP}AM] John: Hello there`,
  `[9/28/26, 12:05:00${NNBSP}PM] Jane: Lunch?`,
  `[9/28/26, 12:30:00${NNBSP}AM] John: late night`,
  `[9/28/26, 11:59:59${NNBSP}PM] Jane: ${LRM}<attached: 00000020-VIDEO-2026-09-28-23-59-59.mp4>`,
  `[9/28/26, 11:59:59${NNBSP}PM] Jane: ${LRM}This message was deleted.`,
].join('\n');

const androidEnGroup = [
  '9/28/26, 9:45 PM - Messages and calls are end-to-end encrypted.',
  '9/28/26, 9:45 PM - Alice created group "Trip: 2026"',
  '9/28/26, 9:46 PM - Alice added Bob',
  '9/28/26, 9:47 PM - Bob: <Media omitted>',
  '9/28/26, 9:48 PM - Carol: check https://example.com',
  '9/28/26, 9:49 PM - Alice: DOC-20260928-WA0002.pdf (file attached)',
].join('\n');

describe('parseChat', () => {
  it('parses Android PT exports with multiline, media, omitted, deleted and edited', () => {
    const chat = parseChat(androidPt);
    expect(chat.dateOrder).toBe('DMY');
    expect(chat.authors).toEqual(['João Silva', 'Maria']);
    expect(chat.messages).toHaveLength(9);

    const [sys, hello, multi, photo, omitted, deleted, edited, audio, sticker] = chat.messages;
    expect(sys.type).toBe('system');
    expect(hello.text).toBe('Bom dia!');
    expect(new Date(hello.ts)).toEqual(new Date(2026, 8, 28, 9, 45));
    expect(multi.text).toBe('Oi João\ntudo bem?\nsegunda linha');
    expect(photo.type).toBe('media');
    expect(photo.media).toEqual({ name: 'IMG-20260928-WA0001.jpg', kind: 'image' });
    expect(photo.text).toBe('legenda da foto');
    expect(omitted.type).toBe('omitted');
    expect(deleted.type).toBe('deleted');
    expect(edited.text).toBe('Texto corrigido');
    expect(edited.edited).toBe(true);
    expect(audio.media?.kind).toBe('audio');
    expect(sticker.media?.kind).toBe('sticker');
    expect(chat.counts).toEqual([4, 4]);
  });

  it('parses iOS PT exports with LRM marks and system notice', () => {
    const chat = parseChat(iosPt);
    expect(chat.messages).toHaveLength(5);
    expect(chat.messages[0].type).toBe('system');
    expect(chat.messages[1].text).toBe('Olá!');
    expect(chat.messages[2].media).toEqual({ name: '00000012-PHOTO-2026-09-28-09-46-00.jpg', kind: 'image' });
    expect(chat.messages[3].type).toBe('omitted');
    expect(chat.messages[4].text).toBe('Linha 1\nLinha 2');
    expect(new Date(chat.messages[1].ts)).toEqual(new Date(2026, 8, 28, 9, 45, 12));
    expect(chat.authors).toEqual(['Ana', 'Bruno']);
  });

  it('parses iOS EN 12h exports with US dates', () => {
    const chat = parseChat(iosEn12h);
    expect(chat.dateOrder).toBe('MDY');
    const hours = chat.messages.map((m) => new Date(m.ts).getHours());
    expect(hours).toEqual([9, 12, 0, 23, 23]);
    expect(new Date(chat.messages[0].ts).getFullYear()).toBe(2026);
    expect(chat.messages[3].media?.kind).toBe('video');
    expect(chat.messages[4].type).toBe('deleted');
  });

  it('parses Android EN group exports with system events', () => {
    const chat = parseChat(androidEnGroup);
    expect(chat.messages.map((m) => m.type)).toEqual(['system', 'system', 'system', 'omitted', 'text', 'media']);
    expect(chat.authors).toEqual(['Bob', 'Carol', 'Alice']);
    expect(chat.messages[5].media?.kind).toBe('doc');
  });

  it('detects DMY when the day is above 12', () => {
    const chat = parseChat('05/03/2026 10:00 - A: x\n25/03/2026 10:00 - B: y');
    expect(chat.dateOrder).toBe('DMY');
    expect(new Date(chat.messages[0].ts).getMonth()).toBe(2);
  });
});

describe('performance', () => {
  it('parses 200k messages quickly', () => {
    const lines: string[] = [];
    const base = new Date(2020, 0, 1).getTime();
    const pad = (n: number) => String(n).padStart(2, '0');
    for (let i = 0; i < 200_000; i++) {
      const t = new Date(base + i * 60_000);
      lines.push(
        `${pad(t.getDate())}/${pad(t.getMonth() + 1)}/${t.getFullYear()} ${pad(t.getHours())}:${pad(t.getMinutes())} - ${i % 3 ? 'João' : 'Maria'}: mensagem número ${i} com acentuação 😄`,
      );
    }
    const start = performance.now();
    const chat = parseChat(lines.join('\n'));
    const elapsed = performance.now() - start;
    expect(chat.messages).toHaveLength(200_000);
    expect(elapsed).toBeLessThan(3000);
  });
});

describe('normalizeForSearch', () => {
  it('keeps length and strips accents', () => {
    const s = 'Ação É ótima 😄 Çà';
    const n = normalizeForSearch(s);
    expect(n).toHaveLength(s.length);
    expect(n).toBe('acao e otima 😄 ca');
  });
});

describe('chatNameFromFile', () => {
  it('extracts chat names', () => {
    expect(chatNameFromFile('Conversa do WhatsApp com Maria.txt')).toBe('Maria');
    expect(chatNameFromFile('WhatsApp Chat - Família.zip')).toBe('Família');
    expect(chatNameFromFile('WhatsApp Chat with John.txt')).toBe('John');
    expect(chatNameFromFile('_chat.txt')).toBe('');
  });
});
