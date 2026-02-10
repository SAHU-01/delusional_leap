import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.deepPlum },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="hook" />
      <Stack.Screen name="dream" />
      <Stack.Screen name="block" />
      <Stack.Screen name="proof" />
      <Stack.Screen name="pace" />
      <Stack.Screen name="vision" />
      <Stack.Screen name="first-move" />
    </Stack>
  );
}
