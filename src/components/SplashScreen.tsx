import React, { useEffect, useRef } from 'react';
import { View, Image, Dimensions, Animated, Easing } from 'react-native';
const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={{
              width: width * 0.6,
              height: width * 0.2,
            }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </View>
  );
} 