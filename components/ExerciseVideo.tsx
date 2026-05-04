import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

import { AppTheme } from '../constants/theme';
import { getExerciseDemoUrl } from '../data/exerciseExamples';

const colors = AppTheme.colors;
const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

type ExerciseVideoProps = {
  exerciseName: string;
  youtubeId?: string;
  fallbackQuery: string;
};

export default function ExerciseVideo({ exerciseName, youtubeId, fallbackQuery }: ExerciseVideoProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const isValidVideo = Boolean(youtubeId && YOUTUBE_ID_PATTERN.test(youtubeId));

  const thumbnailUrl = useMemo(() => {
    return isValidVideo && youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '';
  }, [isValidVideo, youtubeId]);

  const searchUrl = useMemo(() => getExerciseDemoUrl(exerciseName, fallbackQuery), [exerciseName, fallbackQuery]);

  const openFallback = useCallback(() => {
    WebBrowser.openBrowserAsync(searchUrl).catch(() => Linking.openURL(searchUrl));
  }, [searchUrl]);

  useEffect(() => {
    if (!loading) return undefined;

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    return () => clearTimeout(timeout);
  }, [loading]);

  const showPlayer = useCallback(() => {
    if (!isValidVideo) {
      openFallback();
      return;
    }

    setFailed(false);
    setLoading(true);
    setIsVisible(true);
  }, [isValidVideo, openFallback]);

  const handleReady = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setFailed(true);
    setIsVisible(false);
  }, []);

  if (!isValidVideo || failed) {
    return (
      <View style={styles.videoShell}>
        <View style={styles.fallbackPanel}>
          <Ionicons name="logo-youtube" size={24} color={colors.primary} />
          <Text style={styles.fallbackText}>{failed ? 'This embedded demo could not load.' : 'No embedded demo is available yet.'}</Text>
          <Pressable accessibilityRole="link" onPress={openFallback} style={styles.fallbackButton}>
            <Ionicons name="open-outline" size={16} color={colors.text} />
            <Text style={styles.fallbackButtonText}>Open YouTube search</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!isVisible) {
    return (
      <View style={styles.videoShell}>
        <Pressable accessibilityRole="button" onPress={showPlayer} style={styles.thumbnailButton}>
          <Image source={{ uri: thumbnailUrl }} resizeMode="cover" style={styles.thumbnail} />
          <View style={styles.thumbnailOverlay}>
            <View style={styles.playButton}>
              <Ionicons name="play" size={22} color={colors.text} />
            </View>
            <Text style={styles.thumbnailText}>Load demo</Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={openFallback} style={styles.searchLink}>
          <Text style={styles.searchLinkText}>Open on YouTube</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.videoShell}>
      <View style={styles.playerFrame}>
        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.text} />
            <Text style={styles.loadingText}>Loading demo...</Text>
          </View>
        ) : null}
        <YoutubePlayer
          height={210}
          play={false}
          videoId={youtubeId}
          onReady={handleReady}
          onError={handleError}
          webViewProps={{
            allowsFullscreenVideo: true,
          }}
        />
      </View>
      <Pressable accessibilityRole="link" onPress={openFallback} style={styles.searchLink}>
        <Text style={styles.searchLinkText}>Open on YouTube</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  videoShell: { width: '100%', gap: 8 },
  thumbnailButton: { aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  playButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  thumbnailText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  playerFrame: { aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 2, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.input },
  loadingText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  fallbackPanel: { aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14 },
  fallbackText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  fallbackButton: { backgroundColor: colors.primary, borderRadius: 10, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  fallbackButtonText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  searchLink: { alignSelf: 'flex-start', paddingVertical: 4 },
  searchLinkText: { color: colors.info, fontSize: 12, fontWeight: '800' },
});
