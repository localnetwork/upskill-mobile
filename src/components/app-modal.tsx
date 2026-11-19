import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Modal, Pressable, Text, View } from 'react-native';

type FaName = React.ComponentProps<typeof FontAwesome>['name'];

type AppModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: FaName;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose: () => void;
};

export function AppModal({
  visible,
  title,
  message,
  icon = 'check',
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
}: AppModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/70 px-6">
        <Pressable
          onPress={() => {}}
          className="w-full max-w-[400px] rounded-lg border border-[#3E4143] bg-[#1D1E2C] p-6">
          <View className="h-14 w-14 items-center justify-center self-center rounded-full bg-[#A435F0]">
            <FontAwesome name={icon} size={24} color="#fff" />
          </View>
          <Text className="mt-4 text-center text-[22px] font-bold text-white">{title}</Text>
          {message ? (
            <Text className="mt-2 text-center text-[16px] leading-[22px] text-[#D1D7DC]">
              {message}
            </Text>
          ) : null}
          <Pressable
            onPress={onPrimary}
            className="mt-6 items-center bg-[#A435F0] py-3.5 active:opacity-80">
            <Text className="text-[17px] font-bold text-white">{primaryLabel}</Text>
          </Pressable>
          {secondaryLabel ? (
            <Pressable
              onPress={onSecondary ?? onClose}
              className="mt-3 items-center border-2 border-white py-3 active:opacity-80">
              <Text className="text-[17px] font-bold text-white">{secondaryLabel}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
