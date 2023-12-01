import { Camera } from 'expo-camera';

export const requestCameraPermissions = async (setPermissionsGranted: (arg0: boolean) => void) => {
  const { status } = await Camera.requestCameraPermissionsAsync();
  setPermissionsGranted(status === 'granted');
};
