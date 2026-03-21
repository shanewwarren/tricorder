import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import {
	DM_Sans_400Regular,
	DM_Sans_500Medium,
	DM_Sans_600SemiBold,
	DM_Sans_700Bold,
} from "@expo-google-fonts/dm-sans";
import {
	JetBrainsMono_400Regular,
	JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";

import { useColorScheme } from "@/components/useColorScheme";
import { TrpcProvider } from "@/src/lib/TrpcProvider";
import "../global.css";

export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
	// Ensure that reloading on `/modal` keeps a back button present.
	initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const [loaded, error] = useFonts({
		"DM Sans": DM_Sans_400Regular,
		"DM Sans Medium": DM_Sans_500Medium,
		"DM Sans SemiBold": DM_Sans_600SemiBold,
		"DM Sans Bold": DM_Sans_700Bold,
		"JetBrains Mono": JetBrainsMono_400Regular,
		"JetBrains Mono Bold": JetBrainsMono_700Bold,
		SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
	});

	// Expo Router uses Error Boundaries to catch errors in the navigation tree.
	useEffect(() => {
		if (error) throw error;
	}, [error]);

	useEffect(() => {
		if (loaded) {
			SplashScreen.hideAsync();
		}
	}, [loaded]);

	if (!loaded) {
		return null;
	}

	return <RootLayoutNav />;
}

function RootLayoutNav() {
	const colorScheme = useColorScheme();

	return (
		<TrpcProvider>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<Stack>
					<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
					<Stack.Screen name="session/[id]" options={{ headerShown: false }} />
					<Stack.Screen name="new-session" options={{ headerShown: false }} />
					<Stack.Screen name="usage" options={{ headerShown: false }} />
					<Stack.Screen name="modal" options={{ presentation: "modal" }} />
				</Stack>
			</ThemeProvider>
		</TrpcProvider>
	);
}
