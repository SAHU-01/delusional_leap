import { useState, useEffect, useCallback } from 'react';
import Purchases, { CustomerInfo, PurchasesEntitlementInfo } from 'react-native-purchases';

const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'Delusional Leap Pro';

interface UseIsPremiumReturn {
  isPremium: boolean;
  loading: boolean;
  customerInfo: CustomerInfo | null;
  refresh: () => Promise<void>;
}

export function useIsPremium(): UseIsPremiumReturn {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const checkPremiumStatus = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);

      const entitlement = info.entitlements.active[ENTITLEMENT_ID];
      const hasPremium = entitlement !== undefined && entitlement.isActive;

      setIsPremium(hasPremium);

      if (__DEV__) {
        console.log('Premium status check:', {
          entitlementId: ENTITLEMENT_ID,
          hasPremium,
          activeEntitlements: Object.keys(info.entitlements.active),
        });
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPremiumStatus();

    // Listen for customer info updates (subscription changes in real-time)
    const customerInfoUpdateListener = (info: CustomerInfo) => {
      setCustomerInfo(info);
      const entitlement = info.entitlements.active[ENTITLEMENT_ID];
      const hasPremium = entitlement !== undefined && entitlement.isActive;
      setIsPremium(hasPremium);

      if (__DEV__) {
        console.log('Customer info updated:', {
          hasPremium,
          activeEntitlements: Object.keys(info.entitlements.active),
        });
      }
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoUpdateListener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(customerInfoUpdateListener);
    };
  }, [checkPremiumStatus]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await checkPremiumStatus();
  }, [checkPremiumStatus]);

  return { isPremium, loading, customerInfo, refresh };
}
