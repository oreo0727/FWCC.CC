import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
export default function MessagePlayer({ id }: { id: string }) {
  return (
    <View style={styles.box}>
      <WebView
        accessibilityLabel="Message video player"
        source={{
          uri: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1`,
          headers: { Referer: "https://fwcc.cc/" },
        }}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        originWhitelist={["https://*"]}
        mixedContentMode="never"
        setSupportMultipleWindows={false}
        renderError={() => (
          <Text style={styles.error}>
            The player could not load. Use “Open in YouTube” below.
          </Text>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  box: {
    aspectRatio: 16 / 9,
    backgroundColor: "#191b19",
    borderRadius: 16,
    overflow: "hidden",
  },
  error: { color: "#fff", padding: 20 },
});
