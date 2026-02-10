import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/theme';
import { DailyMove, MoveProof } from '@/store/useStore';

const { width, height } = Dimensions.get('window');

interface VerificationModalProps {
  visible: boolean;
  move: DailyMove | null;
  onClose: () => void;
  onComplete: (proof: Omit<MoveProof, 'id' | 'completedAt' | 'date'>) => void;
  hapticEnabled: boolean;
}

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';

// Debug: Log API key status on module load
console.log('=== OPENROUTER API KEY STATUS ===');
console.log('API Key loaded:', process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ? 'YES' : 'NO');
if (!OPENROUTER_API_KEY) {
  console.log('API Key: undefined/empty - MISSING!');
} else {
  console.log('API Key first 10 chars:', OPENROUTER_API_KEY.substring(0, 10) + '...');
  console.log('API Key length:', OPENROUTER_API_KEY.length);
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  visible,
  move,
  onClose,
  onComplete,
  hapticEnabled,
}) => {
  const [proofText, setProofText] = useState('');
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiRejected, setAiRejected] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setProofText('');
      setProofPhoto(null);
      setIsLoading(false);
      setAiRejected(false);
      setAiMessage('');
    }
  }, [visible, move?.id]);

  if (!move) return null;

  const isQuickMove = move.type === 'quick';
  const isPowerMove = move.type === 'power';
  const isBossMove = move.type === 'boss';

  const getMinTextLength = () => {
    if (isQuickMove) return 10;
    return 0;
  };

  const countSentences = (text: string): number => {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
    return sentences.length;
  };

  const isValidSubmission = () => {
    if (isQuickMove) {
      return proofText.length >= 10;
    }
    if (isPowerMove) {
      return proofPhoto !== null;
    }
    if (isBossMove) {
      return countSentences(proofText) >= 3;
    }
    return false;
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const base64 = result.assets[0].base64;
      if (base64) {
        setProofPhoto(`data:image/jpeg;base64,${base64}`);
      }
    }
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const base64 = result.assets[0].base64;
      if (base64) {
        setProofPhoto(`data:image/jpeg;base64,${base64}`);
      }
    }
  };

  const verifyWithAI = async (): Promise<{ verified: boolean; message: string }> => {
    console.log('=== AI VERIFICATION REQUEST ===');
    console.log('Request URL: https://openrouter.ai/api/v1/chat/completions');
    console.log('Model: meta-llama/llama-3.1-8b-instruct:free');
    console.log('Move:', move.title);
    console.log('User proof:', proofText);

    // Log API key status before making request
    if (!OPENROUTER_API_KEY) {
      console.log('WARNING: API Key is undefined/empty!');
    } else {
      console.log('API Key (first 10 chars):', OPENROUTER_API_KEY.substring(0, 10) + '...');
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [
            {
              role: 'system',
              content: 'You are a Move verification assistant for Delusional Leap app. The user was given a specific task (Move) and described what they did. Verify if their description reasonably matches the task. Be encouraging but honest. If it seems like they made a genuine attempt related to the task, verify it. Only reject if the response is clearly unrelated, gibberish, or obviously fake. Respond with JSON only: {"verified": true/false, "message": "one encouraging sentence"}'
            },
            {
              role: 'user',
              content: `Task: ${move.title}. Description: ${move.description}. User's proof: ${proofText}`
            }
          ],
        }),
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('=== AI VERIFICATION RESPONSE ===');
      console.log('Full response:', JSON.stringify(data, null, 2));

      if (data.choices && data.choices[0]?.message?.content) {
        const content = data.choices[0].message.content;
        console.log('AI content:', content);

        try {
          // Try to parse JSON from the response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('Parsed result:', parsed);
            return {
              verified: parsed.verified === true,
              message: parsed.message || (parsed.verified ? 'Great work!' : 'Try to be more specific.'),
            };
          }
        } catch (parseError) {
          console.log('JSON parse error:', parseError);
        }
      }

      // If we couldn't parse the response, fall back to offline
      throw new Error('Could not parse AI response');
    } catch (error) {
      console.log('=== AI VERIFICATION ERROR ===');
      console.log('Error:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!isValidSubmission()) return;

    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (isBossMove) {
      setIsLoading(true);
      setAiRejected(false);
      setAiMessage('');

      try {
        const result = await verifyWithAI();

        if (result.verified) {
          setAiMessage(result.message);
          if (hapticEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          onComplete({
            moveId: move.id,
            moveTitle: move.title,
            moveType: move.type,
            proofType: 'ai_verified',
            proofText: proofText,
            aiVerified: true,
            aiMessage: result.message,
          });
        } else {
          if (hapticEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          setAiRejected(true);
          setAiMessage(result.message || "hmm, that doesn't quite match. try again?");
        }
      } catch (error) {
        // Network error or API failure - allow offline completion
        console.log('API failed, allowing offline completion');
        if (hapticEnabled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onComplete({
          moveId: move.id,
          moveTitle: move.title,
          moveType: move.type,
          proofType: 'ai_verified',
          proofText: proofText,
          aiVerified: true,
          verifiedOffline: true,
          aiMessage: 'verified offline',
        });
      } finally {
        setIsLoading(false);
      }
    } else if (isPowerMove) {
      onComplete({
        moveId: move.id,
        moveTitle: move.title,
        moveType: move.type,
        proofType: 'photo',
        proofPhoto: proofPhoto || undefined,
      });
    } else {
      // Quick move
      onComplete({
        moveId: move.id,
        moveTitle: move.title,
        moveType: move.type,
        proofType: 'text',
        proofText: proofText,
      });
    }
  };

  const getTitle = () => {
    if (isQuickMove) return "tell us what you did in one sentence";
    if (isPowerMove) return "show us the proof";
    if (isBossMove) return "describe what you did — be specific";
    return "";
  };

  const getEmoji = () => {
    if (isQuickMove) return "✍️";
    if (isPowerMove) return "📸";
    if (isBossMove) return "💪";
    return "";
  };

  const getPlaceholder = () => {
    if (isQuickMove) return "I followed @packslight on Instagram ✈️";
    if (isBossMove) return "Write at least 3 sentences describing what you did, how it felt, and what you learned...";
    return "";
  };

  const getSubmitLabel = () => {
    if (isLoading) return "Verifying...";
    if (aiRejected) return "Try Again";
    return "Submit";
  };

  const getValidationMessage = () => {
    if (isQuickMove) {
      const remaining = 10 - proofText.length;
      if (remaining > 0) return `${remaining} more characters needed`;
      return "Ready to submit!";
    }
    if (isBossMove) {
      const sentences = countSentences(proofText);
      const remaining = 3 - sentences;
      if (remaining > 0) return `${remaining} more sentence${remaining > 1 ? 's' : ''} needed`;
      return "Ready to submit!";
    }
    return "";
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.modalContent}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
              <Text style={styles.moveType}>
                {move.type === 'quick' ? '⚡ Quick Move' : move.type === 'power' ? '🔥 Power Move' : '👑 Boss Move'}
              </Text>
            </View>

            {/* Move Title */}
            <Text style={styles.moveTitle}>{move.title}</Text>

            {/* Verification Prompt */}
            <View style={styles.promptContainer}>
              <Text style={styles.promptEmoji}>{getEmoji()}</Text>
              <Text style={styles.promptText}>{getTitle()}</Text>
            </View>

            {/* AI Rejection Message */}
            {aiRejected && (
              <View style={styles.rejectionContainer}>
                <Text style={styles.rejectionText}>🤔 {aiMessage}</Text>
              </View>
            )}

            {/* Input based on move type */}
            {(isQuickMove || isBossMove) && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.textInput,
                    isBossMove && styles.textArea,
                  ]}
                  placeholder={getPlaceholder()}
                  placeholderTextColor="rgba(255, 251, 245, 0.4)"
                  value={proofText}
                  onChangeText={setProofText}
                  multiline={isBossMove}
                  numberOfLines={isBossMove ? 6 : 1}
                  autoFocus
                />
                <Text style={[
                  styles.validationText,
                  isValidSubmission() && styles.validationTextValid
                ]}>
                  {getValidationMessage()}
                </Text>
              </View>
            )}

            {isPowerMove && (
              <View style={styles.photoContainer}>
                {proofPhoto ? (
                  <View style={styles.photoPreviewContainer}>
                    <Image
                      source={{ uri: proofPhoto }}
                      style={styles.photoPreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.retakeButton}
                      onPress={() => setProofPhoto(null)}
                    >
                      <Text style={styles.retakeButtonText}>Retake</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoButtons}>
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={handleTakePhoto}
                    >
                      <LinearGradient
                        colors={[Colors.hibiscus, Colors.sunset]}
                        style={styles.photoButtonGradient}
                      >
                        <Text style={styles.photoButtonEmoji}>📷</Text>
                        <Text style={styles.photoButtonText}>Take Photo</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={handlePickImage}
                    >
                      <View style={styles.photoButtonOutline}>
                        <Text style={styles.photoButtonEmoji}>🖼️</Text>
                        <Text style={styles.photoButtonTextOutline}>Choose Photo</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                !isValidSubmission() && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isValidSubmission() || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={Colors.cream} size="small" />
                  <Text style={styles.submitButtonText}>Verifying with AI...</Text>
                </View>
              ) : (
                <LinearGradient
                  colors={isValidSubmission() ? [Colors.hibiscus, Colors.sunset] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={[
                    styles.submitButtonText,
                    !isValidSubmission() && styles.submitButtonTextDisabled
                  ]}>
                    {getSubmitLabel()}
                  </Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            {isBossMove && !isLoading && (
              <Text style={styles.aiNote}>
                Your response will be verified by AI 🤖
              </Text>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.deepPlum,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: height * 0.85,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.cream,
    fontFamily: Fonts.sora.regular,
  },
  moveType: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.7)',
  },
  moveTitle: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 24,
    color: Colors.cream,
    marginBottom: 24,
  },
  promptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  promptEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  promptText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 16,
    color: Colors.cream,
    flex: 1,
  },
  rejectionContainer: {
    backgroundColor: 'rgba(255, 171, 64, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 171, 64, 0.3)',
  },
  rejectionText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: Colors.amber,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    fontFamily: Fonts.sora.regular,
    fontSize: 16,
    color: Colors.cream,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  validationText: {
    fontFamily: Fonts.sora.regular,
    fontSize: 12,
    color: 'rgba(255, 251, 245, 0.5)',
    marginTop: 8,
    marginLeft: 4,
  },
  validationTextValid: {
    color: Colors.skyTeal,
  },
  photoContainer: {
    marginBottom: 24,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoButtonGradient: {
    padding: 24,
    alignItems: 'center',
  },
  photoButtonOutline: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  photoButtonEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoButtonText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 14,
    color: Colors.cream,
  },
  photoButtonTextOutline: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.8)',
  },
  photoPreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  retakeButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retakeButtonText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: Colors.cream,
  },
  submitButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    gap: 12,
  },
  submitButtonText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 16,
    color: Colors.cream,
  },
  submitButtonTextDisabled: {
    color: 'rgba(255, 251, 245, 0.4)',
  },
  aiNote: {
    fontFamily: Fonts.sora.regular,
    fontSize: 12,
    color: 'rgba(255, 251, 245, 0.5)',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default VerificationModal;
