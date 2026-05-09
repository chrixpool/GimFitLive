import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    SlideInDown
} from 'react-native-reanimated';
import { AppTheme } from '../constants/theme';

const colors = AppTheme.colors;

interface SupportModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SupportModal({ visible, onClose }: SupportModalProps) {
  const [supportType, setSupportType] = useState<'ad' | 'tip' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleWatchAd = async () => {
    setSupportType('ad');
    setIsLoading(true);
    
    // Simulate ad watching (replace with actual ad SDK in production)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    setCompleted(true);
    
    // Close after showing completion
    setTimeout(() => {
      setCompleted(false);
      setSupportType(null);
      onClose();
    }, 1500);
  };

  const handleSendTip = () => {
    setSupportType('tip');
    setCompleted(true);

    setTimeout(() => {
      setCompleted(false);
      setSupportType(null);
      onClose();
    }, 1500);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={[colors.primary, '#FF6B9D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Ionicons name="heart" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Support Gym Tunisia</Text>
            <Text style={styles.subtitle}>
              Help keep the app improving with optional support.
            </Text>
          </View>

          {!supportType ? (
            <Animated.View entering={SlideInDown.duration(400)} style={styles.options}>
              {/* Watch sponsor option */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={handleWatchAd}
                activeOpacity={0.8}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="play-circle" size={32} color={colors.primary} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Watch a sponsor clip</Text>
                  <Text style={styles.optionDescription}>
                    Support development with a short optional video
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
              </TouchableOpacity>

              {/* Send Tip Option */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={handleSendTip}
                activeOpacity={0.8}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="cash" size={32} color={colors.success} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Send a Tip</Text>
                  <Text style={styles.optionDescription}>
                    Tip support is coming soon
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={styles.loadingContainer}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>
                    {supportType === 'ad' ? 'Loading ad...' : 'Processing...'}
                  </Text>
                </>
              ) : completed ? (
                <>
                  <Ionicons name={supportType === 'tip' ? 'time-outline' : 'checkmark-circle'} size={80} color={supportType === 'tip' ? colors.info : colors.success} />
                  <Text style={styles.completedText}>{supportType === 'tip' ? 'Tip support is coming soon.' : 'Thank you for your support!'}</Text>
                </>
              ) : null}
            </Animated.View>
          )}

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Reusable Support Button Component
interface SupportButtonProps {
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function SupportButton({ onPress, size = 'medium' }: SupportButtonProps) {
  const iconSize = size === 'small' ? 20 : size === 'medium' ? 24 : 28;
  
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.supportButton,
        size === 'small' && styles.supportButtonSmall,
        size === 'large' && styles.supportButtonLarge,
      ]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[colors.primary, '#FF6B9D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.supportButtonGradient,
          size === 'small' && styles.supportButtonGradientSmall,
        ]}
      >
        <Ionicons name="heart" size={iconSize} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  options: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderRadius: 14,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textLight,
    marginTop: 8,
  },
  completedText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.success,
    marginTop: 8,
  },
  closeButton: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textLight,
    fontWeight: '500',
  },
  supportButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  supportButtonSmall: {
    width: 36,
    height: 36,
  },
  supportButtonLarge: {
    width: 56,
    height: 56,
  },
  supportButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportButtonGradientSmall: {
    width: 36,
    height: 36,
  },
});
