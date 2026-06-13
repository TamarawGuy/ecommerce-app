import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { useColors } from "@/src/lib/colors";

interface FormTextFieldProps<T extends FieldValues> extends TextInputProps {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

/**
 * A labelled text input wired to react-hook-form via `Controller`. Validation is
 * driven by the form's Zod resolver; this renders the field-level error beneath
 * the input and turns the border red when present. Extra `TextInputProps`
 * (keyboardType, secureTextEntry, autoCapitalize, …) pass straight through.
 */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: FormTextFieldProps<T>) {
  const colors = useColors();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-foreground">{label}</Text>
          <TextInput
            value={value ?? ""}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholderTextColor={colors.muted}
            selectionColor={colors.primary}
            className={`rounded-xl border bg-card px-4 py-3.5 text-base text-foreground ${
              error ? "border-danger" : "border-border"
            }`}
            {...inputProps}
          />
          {error?.message ? (
            <Text className="text-xs text-danger">{error.message}</Text>
          ) : null}
        </View>
      )}
    />
  );
}
