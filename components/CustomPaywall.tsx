import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';
import { Colors, Fonts } from '@/constants/theme';
import { restorePurchases } from '@/utils/revenueCat';

const { width, height } = Dimensions.get('window');

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

interface PlanOption {
  id: string;
  name: string;
  price: string;
  period: string;
  badge?: string;
  isPopular?: boolean;
}

const PLANS: PlanOption[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$4.99',
    period: '/month',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$39.99',
    period: '/year',
    badge: 'Best Value',
    isPopular: true,
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '$79.99',
    period: 'one-time',
  },
];

interface CustomPaywallProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
  hapticEnabled?: boolean;
}

export const CustomPaywall: React.FC<CustomPaywallProps> = ({
  visible,
  onClose,
  onPurchaseSuccess,
  hapticEnabled = true,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleSelectPlan = (planId: string) => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPlan(planId);
  };

  const handlePurchase = async () => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // In Expo Go, purchases don't work
    if (isExpoGo) {
      Alert.alert(
        'Expo Go Limitation',
        'In-app purchases only work in a real APK/IPA build. This demo shows the paywall UI.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);

    try {
      // Get offerings from RevenueCat
      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        Alert.alert('Error', 'No offerings available. Please try again later.');
        return;
      }

      // Find the package matching selected plan
      const packages = offerings.current.availablePackages || [];
      let targetPackage = packages.find((pkg) => {
        const id = pkg.identifier.toLowerCase();
        if (selectedPlan === 'monthly') return id.includes('month');
        if (selectedPlan === 'yearly') return id.includes('year') || id.includes('annual');
        if (selectedPlan === 'lifetime') return id.includes('lifetime');
        return false;
      });

      // Fallback to first package if not found
      if (!targetPackage && packages.length > 0) {
        targetPackage = packages[0];
      }

      if (!targetPackage) {
        Alert.alert('Error', 'Package not found. Please try again later.');
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage(targetPackage);

      // Check if purchase was successful
      const entitlement = customerInfo.entitlements.active['Delusional Leap Pro'];
      if (entitlement?.isActive) {
        if (hapticEnabled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert('Welcome to Pro!', 'You now have unlimited moves!', [
          { text: 'Let\'s Go!', onPress: onPurchaseSuccess || onClose }
        ]);
      }
    } catch (error: any) {
      if (error.userCancelled) {
        // User cancelled, just ignore
        return;
      }
      console.error('Purchase error:', error);
      Alert.alert('Error', error?.message || 'Purchase failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isExpoGo) {
      Alert.alert(
        'Expo Go Limitation',
        'Restore purchases only works in a real APK/IPA build.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsRestoring(true);

    try {
      const result = await restorePurchases();

      if (result.isPremium) {
        if (hapticEnabled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert('Restored!', result.message, [
          { text: 'Great!', onPress: onPurchaseSuccess || onClose }
        ]);
      } else {
        Alert.alert('No Purchases Found', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDismiss = () => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🔥</Text>
            <Text style={styles.headline}>you're on fire</Text>
            <Text style={styles.subtitle}>unlock unlimited Moves to keep going</Text>
          </View>

          {/* Plan Cards */}
          <View style={styles.plansContainer}>
            {PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.planCardSelected,
                  plan.isPopular && styles.planCardPopular,
                ]}
                onPress={() => handleSelectPlan(plan.id)}
                activeOpacity={0.7}
              >
                {plan.badge && (
                  <View style={styles.badgeContainer}>
                    <LinearGradient
                      colors={[Colors.amber, Colors.sunset]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.badge}
                    >
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </LinearGradient>
                  </View>
                )}

                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                  </View>
                </View>

                <View style={[
                  styles.radioOuter,
                  selectedPlan === plan.id && styles.radioOuterSelected,
                ]}>
                  {selectedPlan === plan.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Features */}
          <View style={styles.features}>
            <View style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>Unlimited daily Moves</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>AI-powered verification</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>Premium vision board themes</Text>
            </View>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handlePurchase}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[Colors.hibiscus, Colors.sunset]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.cream} />
              ) : (
                <Text style={styles.ctaText}>Start 7-day free trial</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer Links */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleRestore}
              disabled={isRestoring}
              style={styles.footerLink}
            >
              {isRestoring ? (
                <ActivityIndicator color="rgba(255,251,245,0.6)" size="small" />
              ) : (
                <Text style={styles.footerLinkText}>Restore purchases</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footerDivider}>•</Text>

            <TouchableOpacity onPress={handleDismiss} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Maybe later</Text>
            </TouchableOpacity>
          </View>

          {/* Legal */}
          <Text style={styles.legal}>
            Cancel anytime. Subscription auto-renews unless cancelled 24h before end of current period.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(27, 10, 46, 0.95)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  headline: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 32,
    color: Colors.cream,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.sora.regular,
    fontSize: 16,
    color: 'rgba(255, 251, 245, 0.8)',
    textAlign: 'center',
  },
  plansContainer: {
    width: '100%',
    marginBottom: 24,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: Colors.hibiscus,
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
  },
  planCardPopular: {
    paddingTop: 32,
  },
  badgeContainer: {
    position: 'absolute',
    top: -1,
    left: 16,
    right: 16,
  },
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  badgeText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 11,
    color: Colors.deepPlum,
    textTransform: 'uppercase',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 16,
    color: Colors.cream,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 24,
    color: Colors.cream,
  },
  planPeriod: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.6)',
    marginLeft: 4,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.hibiscus,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.hibiscus,
  },
  features: {
    width: '100%',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureCheck: {
    fontFamily: Fonts.sora.bold,
    fontSize: 16,
    color: Colors.skyTeal,
    marginRight: 12,
  },
  featureText: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.8)',
  },
  ctaButton: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
  },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 18,
    color: Colors.cream,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  footerLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footerLinkText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.6)',
  },
  footerDivider: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.4)',
  },
  legal: {
    fontFamily: Fonts.sora.regular,
    fontSize: 11,
    color: 'rgba(255, 251, 245, 0.4)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default CustomPaywall;
