import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { Platform, Alert } from 'react-native';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '';
const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'Delusional Leap Pro';

export async function initializeRevenueCat() {
  if (!REVENUECAT_API_KEY) {
    console.warn('RevenueCat API key not found in environment variables');
    return;
  }

  try {
    Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
    });

    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
  }
}

export async function checkSubscriptionStatus() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return {};
  }
}

export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error('Error getting offerings:', error);
    return null;
  }
}

export async function restorePurchases(): Promise<{ success: boolean; isPremium: boolean; message: string }> {
  try {
    console.log('Restoring purchases...');
    const customerInfo = await Purchases.restorePurchases();

    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    const isPremium = entitlement !== undefined && entitlement.isActive;

    if (isPremium) {
      console.log('Purchases restored successfully - Premium unlocked!');
      return {
        success: true,
        isPremium: true,
        message: 'Your purchases have been restored! Premium features unlocked.',
      };
    } else {
      console.log('No purchases to restore');
      return {
        success: true,
        isPremium: false,
        message: 'No previous purchases found.',
      };
    }
  } catch (error: any) {
    console.error('Error restoring purchases:', error);
    return {
      success: false,
      isPremium: false,
      message: error?.message || 'Failed to restore purchases. Please try again.',
    };
  }
}

export async function presentPaywall(): Promise<{ purchased: boolean; restored: boolean }> {
  try {
    console.log('Presenting paywall...');

    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID,
    });

    console.log('Paywall result:', result);

    // RevenueCatUI.PAYWALL_RESULT enum values
    // NOT_PRESENTED = 0
    // ERROR = 1
    // CANCELLED = 2
    // PURCHASED = 3
    // RESTORED = 4
    return {
      purchased: result === RevenueCatUI.PAYWALL_RESULT.PURCHASED,
      restored: result === RevenueCatUI.PAYWALL_RESULT.RESTORED,
    };
  } catch (error) {
    console.error('Error presenting paywall:', error);
    return { purchased: false, restored: false };
  }
}

export async function purchaseStreakFreeze(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Attempting to purchase Streak Freeze...');
    const offerings = await Purchases.getOfferings();

    if (!offerings.current) {
      console.log('No offerings available');
      return {
        success: false,
        message: 'Streak Freeze is not available right now. Please try again later.',
      };
    }

    // Look for streak freeze package in current offering
    // Typically consumables are in the 'availablePackages' array
    const allPackages = offerings.current.availablePackages || [];

    // Find the streak freeze package by identifier
    const streakFreezePackage = allPackages.find(
      (pkg) =>
        pkg.identifier.toLowerCase().includes('streak') ||
        pkg.identifier.toLowerCase().includes('freeze') ||
        pkg.product.identifier.toLowerCase().includes('streak') ||
        pkg.product.identifier.toLowerCase().includes('freeze')
    );

    if (!streakFreezePackage) {
      console.log('Streak Freeze package not found in offerings. Available packages:',
        allPackages.map(p => p.identifier));
      return {
        success: false,
        message: 'Streak Freeze is not available right now. Please try again later.',
      };
    }

    console.log('Purchasing streak freeze package:', streakFreezePackage.identifier);
    const { customerInfo } = await Purchases.purchasePackage(streakFreezePackage);

    console.log('Streak Freeze purchased successfully!');
    return {
      success: true,
      message: 'Streak Freeze purchased! Your streak is protected.',
    };
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('User cancelled streak freeze purchase');
      return {
        success: false,
        message: 'Purchase cancelled.',
      };
    }
    console.error('Error purchasing streak freeze:', error);
    return {
      success: false,
      message: error?.message || 'Failed to purchase Streak Freeze. Please try again.',
    };
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Error getting customer info:', error);
    return null;
  }
}

export function isPremiumUser(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  return entitlement !== undefined && entitlement.isActive;
}
