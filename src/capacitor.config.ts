import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.logatto.flowfinance',
  appName: 'Logatto Flow Finance',
  webDir: 'dist',
  backgroundColor: '#FBF7F0',
  android: {
    backgroundColor: '#FBF7F0'
  },
  server: {
    androidScheme: 'https'
  }
}

export default config
