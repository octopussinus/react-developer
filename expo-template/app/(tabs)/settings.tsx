import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useTheme, useThemeColors } from '@/context/ThemeContext';
import { Card } from '@/components/ui/card/Card';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { availableLanguages } from '@/i18n';

type ColorTheme = 'blue' | 'orange' | 'green' | 'purple';

const colorOptions: { label: string; value: ColorTheme; color: string }[] = [
  { label: 'Blue', value: 'blue', color: '#3B82F6' },
  { label: 'Orange', value: 'orange', color: '#F97316' },
  { label: 'Green', value: 'green', color: '#22C55E' },
  { label: 'Purple', value: 'purple', color: '#A855F7' },
];

export default function SettingsScreen() {
  const { theme, toggleTheme, colorTheme, setColorTheme } = useTheme();
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // Get current language, fallback to first available or 'en'
  const currentLang = availableLanguages.includes(i18n.language)
    ? i18n.language
    : availableLanguages.find(l => i18n.language.startsWith(l)) || 'en';

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguagePicker(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('settings')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Customize your app experience.
        </Text>
      </View>

      {/* Language Section */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('language')}
        </Text>

        <TouchableOpacity
          style={[styles.languageSelector, { borderColor: colors.border }]}
          onPress={() => setShowLanguagePicker(!showLanguagePicker)}
        >
          <Text style={[styles.languageCode, { color: colors.text }]}>
            {currentLang.toUpperCase()}
          </Text>
          <Ionicons
            name={showLanguagePicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {showLanguagePicker && (
          <View style={[styles.languageList, { borderColor: colors.border }]}>
            {availableLanguages.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.languageOption,
                  { borderBottomColor: colors.border },
                  currentLang === lang && { backgroundColor: colors.primary + '15' },
                ]}
                onPress={() => handleLanguageChange(lang)}
              >
                <Text style={[styles.languageCode, { color: colors.text }]}>
                  {lang.toUpperCase()}
                </Text>
                {currentLang === lang && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Card>

      {/* Appearance Section */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('appearance')}
        </Text>

        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {t('darkMode')}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              {t('darkModeDescription')}
            </Text>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={theme === 'dark' ? '#fff' : '#f4f4f4'}
          />
        </View>

        <View style={styles.colorThemeSection}>
          <Text style={[styles.settingLabel, { color: colors.text, marginBottom: 12 }]}>
            {t('accentColor')}
          </Text>
          <View style={styles.colorGrid}>
            {colorOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.colorOption,
                  { backgroundColor: option.color },
                  colorTheme === option.value && styles.colorOptionSelected,
                ]}
                onPress={() => setColorTheme(option.value)}
              >
                {colorTheme === option.value && (
                  <Text style={styles.colorCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  colorThemeSection: {
    paddingTop: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  colorCheckmark: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  aboutLabel: {
    fontSize: 14,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Language picker styles
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  languageCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  languageList: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
});
