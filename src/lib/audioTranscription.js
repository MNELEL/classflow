import { base44 } from '@/api/base44Client';

// Whisper (TranscribeAudio) accepts a single file up to 25MB. Uploads allow
// 50MB, so an audio file between 25–50MB uploads but can't be transcribed in
// one shot. transcribeAudioFile handles both: small files go straight to
// TranscribeAudio; large files are decoded in the browser, split into
// ≤25MB WAV chunks, each transcribed, and the transcripts concatenated.
const TRANSCRIBE_MAX_BYTES = 25 * 1024 * 1024;
const TARGET_SAMPLE_RATE = 16000;
const CHUNK_SECONDS = 12 * 60; // 12 min of 16kHz mono WAV ≈ 5.5MB — safely under 25MB

function encodeWavPcm(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);   // PCM
  view.setUint16(22, 1, true);   // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, samples[i], true);
  return new Blob([buffer], { type: 'audio/wav' });
}

function sliceToWav(audioBuffer, startSec, endSec) {
  const srcRate = audioBuffer.sampleRate;
  const startSample = Math.floor(startSec * srcRate);
  const endSample = Math.min(Math.floor(endSec * srcRate), audioBuffer.length);
  const length = endSample - startSample;
  if (length <= 0) return null;
  const channel = audioBuffer.getChannelData(0);
  const ratio = srcRate / TARGET_SAMPLE_RATE;
  const outLength = Math.max(1, Math.floor(length / ratio));
  const pcm = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = Math.floor(i * ratio) + startSample;
    let s = channel[srcIdx] || 0;
    s = Math.max(-1, Math.min(1, s));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return encodeWavPcm(pcm, TARGET_SAMPLE_RATE);
}

async function decodeAudioBuffer(file, fileUrl) {
  // Prefer the in-memory File (same-origin, no CORS) over fetching the URL.
  let arrayBuffer;
  if (file) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    const resp = await fetch(fileUrl);
    arrayBuffer = await resp.arrayBuffer();
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    if (typeof ctx.close === 'function') ctx.close();
  }
}

/**
 * Transcribes an audio file, auto-splitting files larger than 25MB into WAV
 * chunks so Whisper can handle each. Returns the concatenated transcript.
 *
 * @param {Object} opts
 * @param {File} [opts.file] — original File (preferred; avoids CORS on decode)
 * @param {string} opts.fileUrl — uploaded file URL (direct transcription of
 *   small files; fetch fallback for decoding large ones)
 * @param {number} [opts.fileSize] — bytes; decides split vs direct
 * @param {(p:{phase:string,chunk?:number,total?:number})=>void} [opts.onProgress]
 * @returns {Promise<string>} full transcript
 */
export async function transcribeAudioFile({ file, fileUrl, fileSize, onProgress }) {
  if (!fileSize || fileSize <= TRANSCRIBE_MAX_BYTES) {
    onProgress?.({ phase: 'transcribing' });
    const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: fileUrl });
    return (transcript || '').trim();
  }

  onProgress?.({ phase: 'decoding' });
  const audioBuffer = await decodeAudioBuffer(file, fileUrl);
  const duration = audioBuffer.duration;

  const chunks = [];
  for (let t = 0; t < duration; t += CHUNK_SECONDS) {
    const blob = sliceToWav(audioBuffer, t, t + CHUNK_SECONDS);
    if (blob) chunks.push(blob);
  }

  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    onProgress?.({ phase: 'transcribing', chunk: i + 1, total: chunks.length });
    const chunkFile = new File([chunks[i]], `part_${i + 1}.wav`, { type: 'audio/wav' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: chunkFile });
    const part = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
    if (part) parts.push(part);
  }
  return parts.join('\n\n').trim();
}