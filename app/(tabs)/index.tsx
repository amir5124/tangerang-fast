import { View } from 'react-native';
import { ExitToast, useExitOnDoubleBack } from '../../hooks/useExitOnDoubleBack';
import HomeScreen from '../../src/screens/HomeScreen';

export default function TabIndex() {
  const { visible, opacity } = useExitOnDoubleBack();

  return (
    <View style={{ flex: 1 }}>
      <HomeScreen />
      <ExitToast visible={visible} opacity={opacity} />
    </View>
  );
}