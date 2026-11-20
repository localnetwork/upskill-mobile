import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export const INPUT =
  'rounded-md border border-[#6A6F73] bg-black px-4 py-3 text-[16px] text-white';
export const htmlToText = (html: string) =>
  String(html || '')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const textToHtml = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br />')}</p>`)
    .join('');

export const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export function Field({
  label,
  hint,
  counter,
  children,
}: {
  label: string;
  hint?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-5">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-white">{label}</Text>
        {counter ? <Text className="text-[12px] text-[#6A6F73]">{counter}</Text> : null}
      </View>
      {children}
      {hint ? <Text className="mt-2 text-[13px] text-[#D1D7DC]">{hint}</Text> : null}
    </View>
  );
}

export function Feedback({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <Text className="mb-3 text-[14px] text-danger">{error}</Text>;
  if (ok) return <Text className="mb-3 text-[14px] text-success">{ok}</Text>;
  return null;
}

export function Intro({ children }: { children: string }) {
  return <Text className="mb-5 text-[15px] leading-[22px] text-[#D1D7DC]">{children}</Text>;
}

/* ---------------- Media upload ---------------- */

const PLACEHOLDER = require('../../../assets/images/placeholder-cover.webp');
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 500 * 1024 * 1024;

export type MediaFile = { uri: string; name: string; type: string; duration?: number };

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }}
    />
  );
}

export function MediaUpload({
  kind,
  label,
  description,
  path,
  fileName,
  disabledReason,
  onPicked,
}: {
  kind: 'image' | 'video';
  label: string;
  description: string;
  path?: string;
  fileName?: string;
  disabledReason?: string;
  onPicked: (file: MediaFile, setProgress: (p: number) => void) => Promise<void>;
}) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [localName, setLocalName] = useState('');

  const pick = async () => {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError('Permission to access your media library is required.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'image' ? ['images'] : ['videos'],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const ext = (asset.fileName || asset.uri).split('.').pop()?.toLowerCase() || '';
    const type =
      asset.mimeType ||
      (kind === 'image' ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : `video/${ext === 'mov' ? 'quicktime' : ext}`);
    const name = asset.fileName || `${kind}-${Date.now()}.${ext || (kind === 'image' ? 'jpg' : 'mp4')}`;
    const allowed = kind === 'image' ? IMAGE_TYPES : VIDEO_TYPES;
    const max = kind === 'image' ? MAX_IMAGE : MAX_VIDEO;

    if (!allowed.includes(type)) {
      return setError(
        kind === 'image'
          ? 'Invalid file type. Please upload a JPG, PNG, WebP or GIF image.'
          : 'Invalid file type. Please upload an MP4, WebM or MOV video.',
      );
    }
    if (asset.fileSize === 0) return setError('The selected file is empty.');
    if (asset.fileSize && asset.fileSize > max) {
      return setError(
        kind === 'image'
          ? 'Image is too large. Maximum file size is 5MB.'
          : 'Video is too large. Maximum file size is 500MB.',
      );
    }

    setUploading(true);
    setProgress(0);
    try {
      await onPicked(
        { uri: asset.uri, name, type, duration: asset.duration ? asset.duration / 1000 : undefined },
        setProgress,
      );
      setLocalName(name);
    } catch (e) {
      setError(errorText(e, `An error occurred uploading the ${kind}.`));
    } finally {
      setUploading(false);
    }
  };

  const hasFile = Boolean(path);
  const displayName = localName || fileName || (hasFile ? 'Existing File' : 'No File Selected');
  const disabled = uploading || Boolean(disabledReason);

  return (
    <View className="mb-5">
      <Text className="mb-2 text-[15px] font-bold text-white">{label}</Text>
      <View className="overflow-hidden rounded-md border border-[#3E4143]">
        {kind === 'video' && path ? (
          <VideoPreview uri={path} />
        ) : (
          <Image
            source={path ? { uri: path } : PLACEHOLDER}
            contentFit="cover"
            style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }}
          />
        )}
      </View>
      <Text className="mt-3 text-[14px] leading-[21px] text-[#D1D7DC]">{description}</Text>

      <View className="mt-3 flex-row items-center gap-2">
        <View className="min-h-[44px] flex-1 justify-center rounded-md border border-[#6A6F73] px-3">
          <Text numberOfLines={1} className="text-[15px] text-white">
            {uploading ? `Uploading… ${progress}%` : displayName}
          </Text>
        </View>
        <Pressable
          onPress={pick}
          disabled={disabled}
          className="min-h-[44px] items-center justify-center rounded-md border border-[#3588FC] px-4"
          style={{ opacity: disabled ? 0.5 : 1 }}
        >
          <Text className="text-[15px] font-bold text-[#3588FC]">{hasFile ? 'Change File' : 'Upload File'}</Text>
        </Pressable>
      </View>

      {uploading ? (
        <View className="mt-2 h-2 overflow-hidden rounded bg-[#3E4143]">
          <View style={{ width: `${progress}%`, height: '100%', backgroundColor: '#3588FC' }} />
        </View>
      ) : null}
      {disabledReason && !uploading ? (
        <Text className="mt-2 text-[12px] text-[#6A6F73]">{disabledReason}</Text>
      ) : null}
      {error ? <Text className="mt-2 text-[13px] text-danger">{error}</Text> : null}
    </View>
  );
}

