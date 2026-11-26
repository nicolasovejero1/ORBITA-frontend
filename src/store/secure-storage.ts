import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { StateStorage } from 'zustand/middleware';



export const secureStorage: StateStorage = {
  getItem: (name) =>
    Platform.OS === 'web' ? AsyncStorage.getItem(name) : SecureStore.getItemAsync(name),
  setItem: (name, value) =>
    Platform.OS === 'web' ? AsyncStorage.setItem(name, value) : SecureStore.setItemAsync(name, value),
  removeItem: (name) =>
    Platform.OS === 'web' ? AsyncStorage.removeItem(name) : SecureStore.deleteItemAsync(name),
};
