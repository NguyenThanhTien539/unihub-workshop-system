import { StyleSheet, Text, View } from "react-native";

type ScreenPlaceholderProps = {
  title: string;
  description: string;
  todo?: string;
};

export default function ScreenPlaceholder({
  title,
  description,
  todo,
}: ScreenPlaceholderProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {todo ? <Text style={styles.todo}>TODO: {todo}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0, 0, 0, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    color: "#1f2933",
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    color: "#5b6770",
    fontSize: 14,
    marginTop: 6,
  },
  todo: {
    color: "#b45309",
    fontSize: 12,
    marginTop: 8,
  },
});
