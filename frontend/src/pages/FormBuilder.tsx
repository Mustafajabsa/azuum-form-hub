import { useState, useEffect, useCallback, useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import type { DropTargetMonitor } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { v4 as uuidv4 } from "uuid";
import { Search, Moon, Sun } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import {
  Type,
  Text,
  TextQuote,
  TextCursorInput,
  Hash,
  List,
  ListChecks,
  FileInput,
  FileSpreadsheet,
  Calendar,
  Clock,
  Clock3,
  MapPin,
  Map,
  MapPinned,
  Image,
  Music,
  Video,
  File,
  Barcode,
  ListOrdered,
  Calculator,
  FileText,
  Code,
  GanttChart,
  Smartphone,
  Phone,
  User,
  Headphones,
  PanelLeft,
  PanelRight,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Trash2,
  GripVertical,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type FormField = {
  id: string;
  type: string;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  icon: React.ReactNode;
  group: string;
};

const FIELD_GROUPS = [
  "Text & Number",
  "Choice Fields",
  "Date & Time",
  "Location",
  "Media Upload",
  "Special Fields",
  "Logic & Structure",
  "Metadata",
];

const FIELD_TYPES = [
  // Text & Number
  {
    type: "text",
    label: "Text",
    icon: <Type className="w-4 h-4" />,
    group: "Text & Number",
  },
  {
    type: "longtext",
    label: "Long Text",
    icon: <TextQuote className="w-4 h-4" />,
    group: "Text & Number",
  },
  {
    type: "integer",
    label: "Integer",
    icon: <Hash className="w-4 h-4" />,
    group: "Text & Number",
  },
  {
    type: "decimal",
    label: "Decimal",
    icon: <Type className="w-4 h-4" />,
    group: "Text & Number",
  },

  // Choice Fields
  {
    type: "select_one",
    label: "Select One",
    icon: <List className="w-4 h-4" />,
    group: "Choice Fields",
  },
  {
    type: "select_multiple",
    label: "Select Multiple",
    icon: <ListChecks className="w-4 h-4" />,
    group: "Choice Fields",
  },
  {
    type: "select_one_external",
    label: "Select One (External)",
    icon: <FileInput className="w-4 h-4" />,
    group: "Choice Fields",
  },
  {
    type: "select_multiple_external",
    label: "Select Multiple (External)",
    icon: <FileSpreadsheet className="w-4 h-4" />,
    group: "Choice Fields",
  },

  // Date & Time
  {
    type: "date",
    label: "Date",
    icon: <Calendar className="w-4 h-4" />,
    group: "Date & Time",
  },
  {
    type: "time",
    label: "Time",
    icon: <Clock className="w-4 h-4" />,
    group: "Date & Time",
  },
  {
    type: "datetime",
    label: "Date & Time",
    icon: <Clock3 className="w-4 h-4" />,
    group: "Date & Time",
  },
  {
    type: "duration",
    label: "Duration",
    icon: <Clock3 className="w-4 h-4" />,
    group: "Date & Time",
  },

  // Location
  {
    type: "gps_point",
    label: "GPS Point",
    icon: <MapPin className="w-4 h-4" />,
    group: "Location",
  },
  {
    type: "gps_line",
    label: "GPS Line",
    icon: <Map className="w-4 h-4" />,
    group: "Location",
  },
  {
    type: "gps_area",
    label: "GPS Area",
    icon: <MapPinned className="w-4 h-4" />,
    group: "Location",
  },
  {
    type: "map_select",
    label: "Map Select",
    icon: <Map className="w-4 h-4" />,
    group: "Location",
  },

  // Media Upload
  {
    type: "image",
    label: "Image",
    icon: <Image className="w-4 h-4" />,
    group: "Media Upload",
  },
  {
    type: "audio",
    label: "Audio",
    icon: <Music className="w-4 h-4" />,
    group: "Media Upload",
  },
  {
    type: "video",
    label: "Video",
    icon: <Video className="w-4 h-4" />,
    group: "Media Upload",
  },
  {
    type: "file",
    label: "File Upload",
    icon: <File className="w-4 h-4" />,
    group: "Media Upload",
  },

  // Special Fields
  {
    type: "barcode",
    label: "Barcode/QR Code",
    icon: <Barcode className="w-4 h-4" />,
    group: "Special Fields",
  },
  {
    type: "rank",
    label: "Rank",
    icon: <ListOrdered className="w-4 h-4" />,
    group: "Special Fields",
  },
  {
    type: "calculate",
    label: "Calculate",
    icon: <Calculator className="w-4 h-4" />,
    group: "Special Fields",
  },
  {
    type: "note",
    label: "Note",
    icon: <FileText className="w-4 h-4" />,
    group: "Special Fields",
  },

  // Logic & Structure
  {
    type: "group",
    label: "Group",
    icon: <PanelLeft className="w-4 h-4" />,
    group: "Logic & Structure",
  },
  {
    type: "repeat_group",
    label: "Repeat Group",
    icon: <PanelRight className="w-4 h-4" />,
    group: "Logic & Structure",
  },
  {
    type: "matrix",
    label: "Matrix/Likert",
    icon: <GanttChart className="w-4 h-4" />,
    group: "Logic & Structure",
  },

  // Metadata
  {
    type: "start",
    label: "Start",
    icon: <Code className="w-4 h-4" />,
    group: "Metadata",
  },
  {
    type: "end",
    label: "End",
    icon: <Code className="w-4 h-4" />,
    group: "Metadata",
  },
  {
    type: "today",
    label: "Today",
    icon: <Calendar className="w-4 h-4" />,
    group: "Metadata",
  },
  {
    type: "device_id",
    label: "Device ID",
    icon: <Smartphone className="w-4 h-4" />,
    group: "Metadata",
  },
  {
    type: "subscriber_id",
    label: "Subscriber ID",
    icon: <Phone className="w-4 h-4" />,
    group: "Metadata",
  },
  {
    type: "device_phone",
    label: "Device Phone",
    icon: <Phone className="w-4 h-4" />,
    group: "Metadata",
  },
  {
    type: "username",
    label: "Username",
    icon: <User className="w-4 h-4" />,
    group: "Metadata",
  },
  {
    type: "audio_audit",
    label: "Audio Audit",
    icon: <Headphones className="w-4 h-4" />,
    group: "Metadata",
  },
];

interface DraggableFieldProps {
  field: FormField;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  moveField: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableField: React.FC<DraggableFieldProps> = ({
  field,
  index,
  onEdit,
  onDelete,
  moveField,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "field",
    item: { id: field.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "field",
    hover(item: { id: string; index: number }, monitor: DropTargetMonitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveField(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const opacity = isDragging ? 0.4 : 1;
  drag(drop(ref));

  return (
    <div
      ref={ref}
      className="p-3 border rounded-lg bg-white shadow-sm hover:shadow-md transition-all"
      style={{ opacity, cursor: "move" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
          {field.icon}
          <span className="font-medium">{field.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onEdit}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-500 hover:text-red-600"
            onClick={onDelete}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {field.description && (
        <p className="mt-1 text-xs text-gray-500">{field.description}</p>
      )}
    </div>
  );
};

interface FormBuilderState {
  formTitle: string;
  formDescription: string;
  fields: Omit<FormField, "icon" | "group">[];
}

export default function FormBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [formTitle, setFormTitle] = useState("Untitled Form");
  const [formDescription, setFormDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [panelWidth, setPanelWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const moveField = useCallback((dragIndex: number, hoverIndex: number) => {
    setFields((prevFields) => {
      const newFields = [...prevFields];
      const [removed] = newFields.splice(dragIndex, 1);
      newFields.splice(hoverIndex, 0, removed);
      return newFields;
    });
  }, []);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize form from location state if available
  useEffect(() => {
    if (location.state) {
      const { formTitle, formDescription, fields } =
        location.state as FormBuilderState;
      if (formTitle) setFormTitle(formTitle);
      if (formDescription) setFormDescription(formDescription);
      if (fields && fields.length > 0) {
        // Map the fields to include the required icon and group properties
        const mappedFields = fields.map((field) => ({
          ...field,
          icon: FIELD_TYPES.find((ft) => ft.type === field.type)?.icon || (
            <Type className="w-4 h-4" />
          ),
          group:
            FIELD_TYPES.find((ft) => ft.type === field.type)?.group || "Other",
        }));
        setFields(mappedFields);
      }
    }
  }, [location.state]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [showFieldModal, setShowFieldModal] = useState(false);

  const addNewField = (fieldType: string) => {
    const fieldDef = FIELD_TYPES.find((f) => f.type === fieldType);
    if (!fieldDef) return;

    const newField: FormField = {
      id: uuidv4(),
      type: fieldDef.type,
      label: fieldDef.label,
      required: false,
      icon: fieldDef.icon,
      group: fieldDef.group,
    };

    setFields([...fields, newField]);
    setSelectedField(newField);
    setShowFieldModal(false);
  };

  // Handle field drop (for drag and drop functionality)
  const onDrop = (fieldType: string) => {
    addNewField(fieldType);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      )
    );

    if (selectedField?.id === id) {
      setSelectedField({ ...selectedField, ...updates });
    }
  };

  const deleteField = (id: string) => {
    setFields(fields.filter((field) => field.id !== id));
    if (selectedField?.id === id) {
      setSelectedField(null);
    }
  };

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      // Limit the width between 250px and 50% of viewport
      const clampedWidth = Math.min(
        Math.max(newWidth, 250),
        window.innerWidth * 0.5
      );
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-[90vh] max-h-[90vh] bg-gray-50 dark:bg-gray-900 w-full overflow-hidden">
        {/* Field properties panel */}
        {selectedField && (
          <div
            className="relative bg-white dark:bg-gray-800 border-r dark:border-gray-700 overflow-y-auto flex-shrink-0 flex flex-col"
            style={{ width: `${panelWidth}px` }}
          >
            <div className="p-4 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Field Properties
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedField(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div>
                <Label htmlFor="field-label">Label</Label>
                <Input
                  id="field-label"
                  value={selectedField.label}
                  onChange={(e) =>
                    updateField(selectedField.id, { label: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="field-required"
                  checked={selectedField.required}
                  onCheckedChange={(checked) =>
                    updateField(selectedField.id, {
                      required: Boolean(checked),
                    })
                  }
                />
                <Label htmlFor="field-required">Required</Label>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => deleteField(selectedField.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Field
                </Button>
              </div>
            </div>

            {/* Resize handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-200 dark:hover:bg-blue-600 active:bg-blue-400 dark:active:bg-blue-500 transition-colors"
              onMouseDown={() => setIsResizing(true)}
            />
          </div>
        )}

        {/* Form canvas */}
        <div className="flex-1 overflow-y-auto">
          <div
            className={`w-[90%] max-w-4xl mx-auto p-4 ${
              selectedField ? "ml-0" : "mx-auto"
            }`}
          >
            <div
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 flex flex-col`}
              style={{ minHeight: "calc(90vh - 2rem)" }}
            >
              {/* Form header */}
              <div className="p-6 border-b dark:border-gray-700 space-y-4">
                <div>
                  <Input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 p-0 mb-2 bg-transparent dark:text-white"
                    placeholder="Form Title"
                  />
                  <Input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="text-muted-foreground dark:text-gray-400 border-none shadow-none focus-visible:ring-0 p-0 bg-transparent"
                    placeholder="Form description (optional)"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 dark:text-gray-300">
                    Assign to:
                  </label>
                  <select
                    className="border rounded px-3 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    onChange={(e) =>
                      console.log("Assigned to:", e.target.value)
                    }
                  >
                    <option value="">Select a user</option>
                    <option value="user1">John Doe (john@example.com)</option>
                    <option value="user2">Jane Smith (jane@example.com)</option>
                    <option value="user3">Alex Wong (alex@example.com)</option>
                  </select>
                </div>
              </div>

              {/* Form fields */}
              <div
                className="p-6 space-y-4 flex-1 overflow-y-auto"
                onDrop={(e) => {
                  e.preventDefault();
                  const fieldType = e.dataTransfer.getData("text/plain");
                  onDrop(fieldType);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                {fields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg"></div>
                ) : (
                  fields.map((field, index) => (
                    <div
                      key={field.id}
                      className={`relative ${
                        selectedField?.id === field.id
                          ? "ring-2 ring-blue-500 rounded"
                          : ""
                      }`}
                      onClick={() => setSelectedField(field)}
                    >
                      <DraggableField
                        field={field}
                        index={index}
                        onEdit={() => setSelectedField(field)}
                        onDelete={() => deleteField(field.id)}
                        moveField={moveField}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Add field button */}
              <div className="p-4 border-t dark:border-gray-700">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowFieldModal(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>

              {/* Field Selection Modal */}
              {showFieldModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                    <div className="absolute top-4 right-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        {theme === "dark" ? (
                          <Sun className="h-5 w-5" />
                        ) : (
                          <Moon className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold dark:text-white">
                        Add New Field
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowFieldModal(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                        <Input
                          type="text"
                          placeholder="Search fields..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                      {FIELD_TYPES.filter(
                        (field) =>
                          field.label
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          field.group
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          field.type
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                      ).map((field) => (
                        <div
                          key={field.type}
                          className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center space-x-3 transition-colors"
                          onClick={() => {
                            addNewField(field.type);
                            setSearchQuery("");
                          }}
                        >
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                            {field.icon}
                          </div>
                          <div>
                            <div className="font-medium dark:text-white">
                              {field.label}
                              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-400">
                                {field.type}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {field.group}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons - Sticky at the bottom */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700 space-y-2">
                <div className="flex justify-between">
                  <Button variant="outline" className="flex-1 mr-2">
                    Save as Draft
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (fields.length === 0) {
                        alert(
                          "Please add at least one field to the form before previewing."
                        );
                        return;
                      }
                      navigate("/forms/preview", {
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
                    Preview
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Save & Publish
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}

// This is the end of the file
