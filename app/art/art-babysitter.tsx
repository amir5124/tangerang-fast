import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
// If using @expo/vector-icons:
// import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";

// ─── Types ───────────────────────────────────────────────────────────────────
type KategoriType = "Menginap" | "Pulang Pergi" | "Inval";
type LayananType = "ART" | "Babysitter";

interface FormState {
    kategori: KategoriType;
    layanan: LayananType;
    jobdesk: string;
}

// ─── Step Card Component ──────────────────────────────────────────────────────
const StepCard = ({
    color,
    icon,
    title,
    description,
}: {
    color: string;
    icon: React.ReactNode;
    title: string;
    description: string;
}) => (
    <View
        style={{
            flex: 1,
            backgroundColor: color,
            borderRadius: 12,
            padding: 12,
            marginHorizontal: 3,
        }}
    >
        <View style={{ marginBottom: 8 }}>{icon}</View>
        <Text style={{ color: "white", fontWeight: "700", fontSize: 13, marginBottom: 4 }}>
            {title}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, lineHeight: 14 }}>
            {description}
        </Text>
    </View>
);

// ─── Radio Option Component ───────────────────────────────────────────────────
const RadioOption = ({
    label,
    selected,
    onPress,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
}) => (
    <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
            opacity: pressed ? 0.7 : 1,
        })}
    >
        <Text style={{ fontSize: 15, color: "#1f2937", fontWeight: selected ? "600" : "400" }}>
            {label}
        </Text>
        {/* Radio circle */}
        <View
            style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: selected ? "#3b5bdb" : "#d1d5db",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "white",
            }}
        >
            {selected && (
                <View
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: "#3b5bdb",
                    }}
                />
            )}
        </View>
    </Pressable>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ArtBabysitterScreen() {
    const router = useRouter();

    const [form, setForm] = useState<FormState>({
        kategori: "Menginap",
        layanan: "ART",
        jobdesk: "",
    });

    const handleNext = () => {
        // Navigate to next screen and pass form state as params
        router.push({
            pathname: "/art/detail-kontak", // adjust to your route
            params: {
                kategori: form.kategori,
                layanan: form.layanan,
                jobdesk: form.jobdesk,
            },
        });
    };

    const KATEGORI_OPTIONS: KategoriType[] = ["Menginap", "Pulang Pergi", "Inval"];
    const LAYANAN_OPTIONS: LayananType[] = ["ART", "Babysitter"];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f4ff" }}>
            <StatusBar barStyle="light-content" backgroundColor="#3b5bdb" />

            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </Pressable>
                <Text style={styles.headerTitle}>ART & Baby Sitter</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Cara Untuk Order ────────────────────────────────────────── */}
                <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 12 }}>
                        Cara Untuk Order
                    </Text>
                    <View style={{ flexDirection: "row" }}>
                        <StepCard
                            color="#5c3bbb"
                            title="Registrasi & Request"
                            description="Lengkapi data untuk menetukan kriteria pekerja"
                            icon={
                                <Text style={{ fontSize: 20, color: "white" }}>☰</Text>
                            }
                        />
                        <StepCard
                            color="#3a9c3c"
                            title="Pilih Kandidat"
                            description="cek langsung daftar pekerja siap kerja"
                            icon={
                                <Text style={{ fontSize: 20, color: "white" }}>👤</Text>
                            }
                        />
                        <StepCard
                            color="#b94040"
                            title="Dapat Pekerja"
                            description="Kandidat atau pekerja tiba di rumah Anda"
                            icon={
                                <Text style={{ fontSize: 20, color: "white" }}>☆</Text>
                            }
                        />
                    </View>
                </View>

                {/* ── White Card Container ─────────────────────────────────────── */}
                <View
                    style={{
                        backgroundColor: "white",
                        marginHorizontal: 16,
                        marginTop: 16,
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingTop: 4,
                        paddingBottom: 8,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 6,
                        elevation: 2,
                    }}
                >
                    {/* Kategori */}
                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: "#111827",
                            paddingTop: 16,
                            paddingBottom: 4,
                        }}
                    >
                        Kategori
                    </Text>
                    {KATEGORI_OPTIONS.map((opt) => (
                        <RadioOption
                            key={opt}
                            label={opt}
                            selected={form.kategori === opt}
                            onPress={() => setForm((prev) => ({ ...prev, kategori: opt }))}
                        />
                    ))}

                    {/* Layanan yang anda butuhkan */}
                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: "#111827",
                            paddingTop: 20,
                            paddingBottom: 4,
                        }}
                    >
                        Layanan yang anda butuhkan
                    </Text>
                    {LAYANAN_OPTIONS.map((opt) => (
                        <RadioOption
                            key={opt}
                            label={opt}
                            selected={form.layanan === opt}
                            onPress={() => setForm((prev) => ({ ...prev, layanan: opt }))}
                        />
                    ))}

                    {/* Detail Pekerjaan */}
                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: "#111827",
                            paddingTop: 20,
                            paddingBottom: 8,
                        }}
                    >
                        Detail Pekerjaan yang akan di lakukan
                    </Text>
                    <TextInput
                        multiline
                        numberOfLines={5}
                        placeholder="Jobdesk .."
                        placeholderTextColor="#9ca3af"
                        value={form.jobdesk}
                        onChangeText={(t) => setForm((prev) => ({ ...prev, jobdesk: t }))}
                        style={{
                            borderWidth: 1,
                            borderColor: "#e5e7eb",
                            borderRadius: 10,
                            padding: 12,
                            fontSize: 14,
                            color: "#1f2937",
                            textAlignVertical: "top",
                            minHeight: 100,
                            backgroundColor: "#fafafa",
                            marginBottom: 8,
                        }}
                    />
                </View>
            </ScrollView>

            {/* ── Fixed Bottom Button ──────────────────────────────────────────── */}
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: Platform.OS === "ios" ? 28 : 16,
                    borderTopWidth: 1,
                    borderTopColor: "#f3f4f6",
                }}
            >
                <Pressable
                    onPress={handleNext}
                    style={({ pressed }) => ({
                        backgroundColor: pressed ? "#2f4ec7" : "#3b5bdb",
                        borderRadius: 12,
                        paddingVertical: 16,
                        alignItems: "center",
                        shadowColor: "#3b5bdb",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                    })}
                >
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                        Selanjutnya
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // Header
    header: {
        backgroundColor: '#3b5bdb',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    backButton: {
        width: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        flex: 1,
    }
});