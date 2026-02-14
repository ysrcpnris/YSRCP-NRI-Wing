type Props = {
  password: string;
};

export default function PasswordRules({ password }: Props) {
  const rules = [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "Contains uppercase letter",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "Contains lowercase letter",
      valid: /[a-z]/.test(password),
    },
    {
      label: "Contains number",
      valid: /\d/.test(password),
    },
    {
      label: "Contains special character",
      valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  return (
    <div className="mt-2 text-sm space-y-1">
      {rules.map((rule, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 ${
            rule.valid ? "text-green-600" : "text-gray-500"
          }`}
        >
          <span>
            {rule.valid ? "✔" : "•"}
          </span>
          <span>{rule.label}</span>
        </div>
      ))}
    </div>
  );
}
