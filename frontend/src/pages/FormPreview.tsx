import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useTheme } from "@/hooks/use-theme";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface FormField {
  id: string;
  type: string;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
}

interface FormPreviewData {
  formTitle: string;
  formDescription: string;
  fields: FormField[];
}

export default function FormPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState<FormPreviewData>({
    formTitle: "Untitled Form",
    formDescription: "",
    fields: [],
  });

  useEffect(() => {
    if (location.state) {
      setFormData(location.state as FormPreviewData);
    } else {
      // If no state is passed, redirect back to form builder
      navigate("/forms/builder");
    }
  }, [location.state, navigate]);

  const { toast } = useToast();
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const { formTitle, formDescription, fields } = formData;

  // Map field types from builder to preview
  const mapFieldType = (type: string): string => {
    const typeMap: Record<string, string> = {
      select_one: "select",
      select_multiple: "multiselect",
      longtext: "textarea",
      integer: "number",
      decimal: "number",
      date: "date",
      time: "time",
      datetime: "datetime-local",
      gps_point: "text",
      gps_line: "text",
      gps_area: "text",
      map_select: "text",
      image: "file",
      audio: "file",
      video: "file",
      file: "file",
      barcode: "text",
      phone: "tel",
      email: "email",
      url: "url",
      rating: "number",
      signature: "text",
      calculator: "text",
      note: "text",
      divider: "divider",
      page_break: "divider",
      group: "group",
    };
    return typeMap[type] || type;
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formValues);
    toast({
      title: "Form submitted successfully!",
      description: "Your form data has been submitted.",
    });
  };

  const renderField = (field: FormField) => {
    const fieldType = mapFieldType(field.type);
    const fieldId = `field-${field.id}`;
    const fieldValue = formValues[field.id] || "";

    const commonProps = {
      id: fieldId,
      required: field.required,
      value: fieldValue,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => handleInputChange(field.id, e.target.value),
      className:
        "w-full p-2 border rounded mt-1 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500",
    };

    switch (fieldType) {
      case "text":
      case "number":
      case "date":
      case "time":
      case "datetime-local":
        return (
          <div key={field.id} className="mb-4">
            <label
              htmlFor={fieldId}
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              type={fieldType}
              {...commonProps}
              step={field.type === "decimal" ? "0.01" : undefined}
              min={
                fieldType === "date"
                  ? new Date().toISOString().split("T")[0]
                  : undefined
              }
            />
            {field.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {field.description}
              </p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="mb-4">
            <label
              htmlFor={fieldId}
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Textarea {...commonProps} rows={4} className="min-h-[100px]" />
            {field.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {field.description}
              </p>
            )}
          </div>
        );

      case "select":
      case "multiselect":
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Select
              onValueChange={(value) => handleInputChange(field.id, value)}
              value={fieldValue}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={`Select ${field.label.toLowerCase()}`}
                />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {field.description}
              </p>
            )}
          </div>
        );

      case "checkbox":
        return (
          <div
            key={field.id}
            className="mb-4 flex items-start text-gray-700 dark:text-gray-200"
          >
            <Checkbox
              id={fieldId}
              checked={!!fieldValue}
              onCheckedChange={(checked) =>
                handleInputChange(field.id, checked)
              }
              className="mt-1"
            />
            <label
              htmlFor={fieldId}
              className="ml-2 text-sm text-gray-700 dark:text-gray-200"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              {field.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {field.description}
                </p>
              )}
            </label>
          </div>
        );

      case "file":
        return (
          <div key={field.id} className="mb-4">
            <label
              htmlFor={fieldId}
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              type="file"
              id={fieldId}
              accept="image/png, image/jpeg, image/gif, video/*, audio/*, application/pdf, .doc, .docx, .xls, .xlsx, .csv, .zip, .txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleInputChange(field.id, file.name);
                }
              }}
              className="mt-1"
            />
            {field.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {field.description}
              </p>
            )}
          </div>
        );

      case "divider":
        return (
          <div
            key={field.id}
            className="my-6 border-t border-gray-200 dark:border-gray-700"
          >
            {field.label && (
              <div className="text-center -mt-3">
                <span className="bg-white dark:bg-gray-800 px-2 text-sm text-muted-foreground dark:text-gray-300">
                  {field.label}
                </span>
              </div>
            )}
          </div>
        );

      case "group":
        return (
          <div
            key={field.id}
            className="mb-4 border rounded-lg p-4 dark:border-gray-700 dark:bg-gray-700"
          >
            {field.label && (
              <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">
                {field.label}
              </h3>
            )}
            {field.description && (
              <p className="text-sm text-muted-foreground dark:text-gray-300 mb-3">
                {field.description}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div
            key={field.id}
            className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded"
          >
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Field type "{field.type}" is not fully supported in preview.
              Displaying as text input.
            </p>
            <Input
              type="text"
              placeholder={`Enter ${field.label || field.type}`}
              {...commonProps}
              className="mt-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900">
      {/* Fixed header with back button */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => {
              navigate("/forms/builder", {
                state: {
                  formTitle,
                  formDescription,
                  fields: fields.map((field) => ({
                    id: field.id,
                    type: field.type,
                    label: field.label,
                    description: field.description || "",
                    required: field.required,
                    options: field.options || [],
                  })),
                },
                replace: true,
              });
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Builder
          </Button>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <div className="text-sm text-muted-foreground dark:text-gray-400">
              Preview Mode
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="p-6 border-b dark:border-gray-700">
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              {formTitle}
            </h1>
            {formDescription && (
              <p className="text-muted-foreground dark:text-gray-300">
                {formDescription}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6 dark:text-gray-200">
              {fields.length > 0 ? (
                fields.map((field) => renderField(field))
              ) : (
                <div className="text-center py-12 text-muted-foreground dark:text-gray-400">
                  No fields added to this form yet.
                </div>
              )}

              {fields.length > 0 && (
                <div className="pt-6 border-t dark:border-gray-700 mt-8">
                  <Button type="submit" className="w-full sm:w-auto">
                    Submit Form
                  </Button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
