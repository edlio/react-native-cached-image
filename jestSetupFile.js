// import mockAsyncStorage from '@react-native-community/async-storage/jest/async-storage-mock';
import MockAsyncStorage from 'mock-async-storage';
const mockImpl = new MockAsyncStorage()
jest.mock('@react-native-community/async-storage', () => mockImpl);