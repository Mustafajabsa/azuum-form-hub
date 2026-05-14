import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService, ProfileData } from "@/api/services/authService";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Edit,
  Trash2,
  RotateCcw,
  Upload,
  X,
  Plus,
  Mail,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type LogoType = "topLeft" | "topRight";

const Settings = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userCreationError, setUserCreationError] = useState<string | null>(
    null,
  );
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAdmin) return;

      setIsLoadingUsers(true);
      setUsersError(null);
      try {
        const usersData = await authService.getUsers();
        // Transform user data to match the expected format
        const transformedUsers = usersData.map((user: any) => ({
          id: user.id,
          name:
            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
            user.username,
          email: user.email,
          role: user.role,
          firstName: user.first_name || "",
          lastName: user.last_name || "",
          phone: user.profile?.phone || "",
          storageQuota: user.storage_quota
            ? Math.round(user.storage_quota / 1073741824)
            : 0, // Convert bytes to GB
          canCreate: user.role !== "Finance", // Example logic - adjust as needed
        }));
        setUsers(transformedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsersError("Failed to load users");
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isAdmin]);

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const [currentUser, setCurrentUser] = useState({
    id: 0,
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    country_code: "+1",
    role: "Project Manager",
    storage_quota: 1000,
    password: "",
    password2: "",
    canCreate: false,
  });
  const [topLeftLogo, setTopLeftLogo] = useState<File | null>(null);
  const [topRightLogo, setTopRightLogo] = useState<File | null>(null);
  const [logoPreviews, setLogoPreviews] = useState<{
    [key in LogoType]?: string;
  }>({});
  const fileInputRefs = {
    topLeft: useRef<HTMLInputElement>(null),
    topRight: useRef<HTMLInputElement>(null),
  };

  // Country phone codes data
  const countryPhoneCodes = [
    { code: "+1", name: "United States", pattern: /^\d{10}$/ },
    { code: "+44", name: "United Kingdom", pattern: /^\d{10,11}$/ },
    { code: "+91", name: "India", pattern: /^[6-9]\d{9}$/ },
    { code: "+86", name: "China", pattern: /^\d{11}$/ },
    { code: "+81", name: "Japan", pattern: /^\d{10}$/ },
    { code: "+49", name: "Germany", pattern: /^\d{10,11}$/ },
    { code: "+33", name: "France", pattern: /^\d{9}$/ },
    { code: "+39", name: "Italy", pattern: /^\d{9,10}$/ },
    { code: "+34", name: "Spain", pattern: /^\d{9}$/ },
    { code: "+31", name: "Netherlands", pattern: /^\d{9}$/ },
    { code: "+61", name: "Australia", pattern: /^\d{9}$/ },
    { code: "+7", name: "Russia", pattern: /^\d{10}$/ },
    { code: "+55", name: "Brazil", pattern: /^\d{10,11}$/ },
    { code: "+52", name: "Mexico", pattern: /^\d{10}$/ },
    { code: "+82", name: "South Korea", pattern: /^\d{10}$/ },
    { code: "+27", name: "South Africa", pattern: /^\d{9}$/ },
    { code: "+20", name: "Egypt", pattern: /^\d{10}$/ },
    { code: "+966", name: "Saudi Arabia", pattern: /^\d{9}$/ },
    { code: "+971", name: "UAE", pattern: /^\d{9}$/ },
    { code: "+1", name: "Canada", pattern: /^\d{10}$/ },
    { code: "+54", name: "Argentina", pattern: /^\d{10}$/ },
    { code: "+57", name: "Colombia", pattern: /^\d{10}$/ },
    { code: "+58", name: "Venezuela", pattern: /^\d{10}$/ },
    { code: "+51", name: "Peru", pattern: /^\d{9}$/ },
    { code: "+56", name: "Chile", pattern: /^\d{9}$/ },
    { code: "+590", name: "Bolivia", pattern: /^\d{8}$/ },
    { code: "+593", name: "Paraguay", pattern: /^\d{9}$/ },
    { code: "+595", name: "Uruguay", pattern: /^\d{8}$/ },
    { code: "+502", name: "Costa Rica", pattern: /^\d{8}$/ },
    { code: "+503", name: "El Salvador", pattern: /^\d{8}$/ },
    { code: "+504", name: "Honduras", pattern: /^\d{8}$/ },
    { code: "+505", name: "Nicaragua", pattern: /^\d{8}$/ },
    { code: "+506", name: "Guatemala", pattern: /^\d{8}$/ },
    { code: "+507", name: "Panama", pattern: /^\d{8}$/ },
    { code: "+1", name: "Jamaica", pattern: /^\d{7}$/ },
    { code: "+1", name: "Trinidad & Tobago", pattern: /^\d{7}$/ },
    { code: "+1", name: "Barbados", pattern: /^\d{7}$/ },
    { code: "+473", name: "Guyana", pattern: /^\d{7}$/ },
    { code: "+592", name: "French Guiana", pattern: /^\d{9}$/ },
    { code: "+212", name: "Morocco", pattern: /^\d{9}$/ },
    { code: "+213", name: "Algeria", pattern: /^\d{9}$/ },
    { code: "+216", name: "Tunisia", pattern: /^\d{8}$/ },
    { code: "+218", name: "Libya", pattern: /^\d{9}$/ },
    { code: "+220", name: "Gambia", pattern: /^\d{7}$/ },
    { code: "+221", name: "Senegal", pattern: /^\d{9}$/ },
    { code: "+222", name: "Mauritania", pattern: /^\d{8}$/ },
    { code: "+223", name: "Mali", pattern: /^\d{8}$/ },
    { code: "+224", name: "Guinea", pattern: /^\d{9}$/ },
    { code: "+225", name: "Burkina Faso", pattern: /^\d{8}$/ },
    { code: "+226", name: "Niger", pattern: /^\d{8}$/ },
    { code: "+227", name: "Togo", pattern: /^\d{8}$/ },
    { code: "+228", name: "Côte d'Ivoire", pattern: /^\d{10}$/ },
    { code: "+229", name: "Benin", pattern: /^\d{8}$/ },
    { code: "+230", name: "Mauritius", pattern: /^\d{7}$/ },
    { code: "+231", name: "Liberia", pattern: /^\d{7}$/ },
    { code: "+232", name: "Sierra Leone", pattern: /^\d{8}$/ },
    { code: "+233", name: "Ghana", pattern: /^\d{9}$/ },
    { code: "+234", name: "Nigeria", pattern: /^\d{10}$/ },
    { code: "+235", name: "Chad", pattern: /^\d{8}$/ },
    { code: "+236", name: "Central African Republic", pattern: /^\d{8}$/ },
    { code: "+237", name: "Congo", pattern: /^\d{9}$/ },
    { code: "+238", name: "São Tomé & Príncipe", pattern: /^\d{7}$/ },
    { code: "+239", name: "Equatorial Guinea", pattern: /^\d{6}$/ },
    { code: "+240", name: "Gabon", pattern: /^\d{7}$/ },
    { code: "+241", name: "Gabon", pattern: /^\d{7}$/ },
    { code: "+242", name: "Congo (DRC)", pattern: /^\d{9}$/ },
    { code: "+243", name: "Congo (Republic)", pattern: /^\d{7}$/ },
    { code: "+244", name: "Guinea-Bissau", pattern: /^\d{7}$/ },
    { code: "+245", name: "Guinea", pattern: /^\d{9}$/ },
    { code: "+246", name: "Diego Garcia", pattern: /^\d{6}$/ },
    { code: "+247", name: "Ascension", pattern: /^\d{4}$/ },
    { code: "+248", name: "Seychelles", pattern: /^\d{7}$/ },
    { code: "+249", name: "Sudan", pattern: /^\d{9}$/ },
    { code: "+250", name: "Rwanda", pattern: /^\d{9}$/ },
    { code: "+251", name: "Ethiopia", pattern: /^\d{9}$/ },
    { code: "+252", name: "Somalia", pattern: /^\d{8}$/ },
    { code: "+253", name: "Djibouti", pattern: /^\d{6}$/ },
    { code: "+254", name: "Kenya", pattern: /^\d{9}$/ },
    { code: "+255", name: "Tanzania", pattern: /^\d{9}$/ },
    { code: "+256", name: "Uganda", pattern: /^\d{9}$/ },
    { code: "+257", name: "Burundi", pattern: /^\d{8}$/ },
    { code: "+258", name: "Mozambique", pattern: /^\d{9}$/ },
    { code: "+260", name: "Zambia", pattern: /^\d{9}$/ },
    { code: "+261", name: "Zimbabwe", pattern: /^\d{9}$/ },
    { code: "+262", name: "Madagascar", pattern: /^\d{9}$/ },
    { code: "+263", name: "Mayotte", pattern: /^\d{9}$/ },
    { code: "+264", name: "Reunion", pattern: /^\d{9}$/ },
    { code: "+265", name: "Botswana", pattern: /^\d{7}$/ },
    { code: "+266", name: "Lesotho", pattern: /^\d{8}$/ },
    { code: "+267", name: "Namibia", pattern: /^\d{9}$/ },
    { code: "+268", name: "Swaziland", pattern: /^\d{8}$/ },
    { code: "+269", name: "Comoros", pattern: /^\d{7}$/ },
    { code: "+290", name: "Saint Helena", pattern: /^\d{4}$/ },
    { code: "+291", name: "Eritrea", pattern: /^\d{7}$/ },
    { code: "+297", name: "Aruba", pattern: /^\d{7}$/ },
    { code: "+298", name: "Faroe Islands", pattern: /^\d{6}$/ },
    { code: "+299", name: "Greenland", pattern: /^\d{6}$/ },
    { code: "+351", name: "Portugal", pattern: /^\d{9}$/ },
    { code: "+352", name: "Luxembourg", pattern: /^\d{9}$/ },
    { code: "+353", name: "Ireland", pattern: /^\d{9}$/ },
    { code: "+354", name: "Iceland", pattern: /^\d{7}$/ },
    { code: "+355", name: "Albania", pattern: /^\d{9}$/ },
    { code: "+356", name: "Malta", pattern: /^\d{8}$/ },
    { code: "+357", name: "Cyprus", pattern: /^\d{8}$/ },
    { code: "+358", name: "Finland", pattern: /^\d{9}$/ },
    { code: "+359", name: "Bulgaria", pattern: /^\d{9}$/ },
    { code: "+370", name: "Lithuania", pattern: /^\d{8}$/ },
    { code: "+371", name: "Latvia", pattern: /^\d{8}$/ },
    { code: "+372", name: "Estonia", pattern: /^\d{7}$/ },
    { code: "+373", name: "Moldova", pattern: /^\d{8}$/ },
    { code: "+374", name: "Romania", pattern: /^\d{9}$/ },
    { code: "+375", name: "Moldova", pattern: /^\d{8}$/ },
    { code: "+376", name: "Montenegro", pattern: /^\d{8}$/ },
    { code: "+377", name: "Serbia", pattern: /^\d{8}$/ },
    { code: "+378", name: "North Macedonia", pattern: /^\d{8}$/ },
    { code: "+380", name: "Ukraine", pattern: /^\d{9}$/ },
    { code: "+381", name: "Serbia", pattern: /^\d{8}$/ },
    { code: "+382", name: "Romania", pattern: /^\d{9}$/ },
    { code: "+383", name: "San Marino", pattern: /^\d{8}$/ },
    { code: "+385", name: "Croatia", pattern: /^\d{9}$/ },
    { code: "+386", name: "Slovenia", pattern: /^\d{8}$/ },
    { code: "+387", name: "Bosnia", pattern: /^\d{8}$/ },
    { code: "+389", name: "Macedonia", pattern: /^\d{8}$/ },
    { code: "+40", name: "Turkey", pattern: /^\d{10}$/ },
    { code: "+41", name: "Switzerland", pattern: /^\d{9}$/ },
    { code: "+43", name: "Austria", pattern: /^\d{10}$/ },
    { code: "+46", name: "Sweden", pattern: /^\d{9}$/ },
    { code: "+47", name: "Norway", pattern: /^\d{8}$/ },
    { code: "+48", name: "Poland", pattern: /^\d{9}$/ },
    { code: "+420", name: "Czech Republic", pattern: /^\d{9}$/ },
    { code: "+421", name: "Slovakia", pattern: /^\d{9}$/ },
    { code: "+423", name: "Belarus", pattern: /^\d{9}$/ },
    { code: "+358", name: "Cyprus", pattern: /^\d{8}$/ },
    { code: "+994", name: "Azerbaijan", pattern: /^\d{9}$/ },
    { code: "+995", name: "Georgia", pattern: /^\d{9}$/ },
    { code: "+996", name: "Kyrgyzstan", pattern: /^\d{9}$/ },
    { code: "+92", name: "Pakistan", pattern: /^\d{10}$/ },
    { code: "+93", name: "Afghanistan", pattern: /^\d{9}$/ },
    { code: "+94", name: "Sri Lanka", pattern: /^\d{9}$/ },
    { code: "+98", name: "Iran", pattern: /^\d{10}$/ },
    { code: "+992", name: "Tajikistan", pattern: /^\d{9}$/ },
    { code: "+993", name: "Turkmenistan", pattern: /^\d{8}$/ },
    { code: "+996", name: "Uzbekistan", pattern: /^\d{9}$/ },
    { code: "+998", name: "Kyrgyzstan", pattern: /^\d{9}$/ },
    { code: "+855", name: "Cambodia", pattern: /^\d{8}$/ },
    { code: "+856", name: "Laos", pattern: /^\d{8}$/ },
    { code: "+65", name: "Singapore", pattern: /^\d{8}$/ },
    { code: "+60", name: "Malaysia", pattern: /^\d{9}$/ },
    { code: "+62", name: "Indonesia", pattern: /^\d{8,12}$/ },
    { code: "+63", name: "Philippines", pattern: /^\d{10}$/ },
    { code: "+64", name: "New Zealand", pattern: /^\d{9}$/ },
    { code: "+672", name: "East Timor", pattern: /^\d{7}$/ },
    { code: "+670", name: "Papua New Guinea", pattern: /^\d{7}$/ },
    { code: "+672", name: "Solomon Islands", pattern: /^\d{7}$/ },
    { code: "+673", name: "New Caledonia", pattern: /^\d{6}$/ },
    { code: "+674", name: "French Polynesia", pattern: /^\d{6}$/ },
    { code: "+675", name: "Tahiti", pattern: /^\d{6}$/ },
    { code: "+676", name: "Tonga", pattern: /^\d{5}$/ },
    { code: "+677", name: "Wallis", pattern: /^\d{6}$/ },
    { code: "+678", name: "Vanuatu", pattern: /^\d{7}$/ },
    { code: "+679", name: "Cook Islands", pattern: /^\d{5}$/ },
    { code: "+680", name: "Fiji", pattern: /^\d{7}$/ },
    { code: "+681", name: "Kiribati", pattern: /^\d{5}$/ },
    { code: "+682", name: "Nauru", pattern: /^\d{7}$/ },
    { code: "+683", name: "Tuvalu", pattern: /^\d{5}$/ },
    { code: "+684", name: "Palau", pattern: /^\d{7}$/ },
    { code: "+685", name: "Marshall Islands", pattern: /^\d{7}$/ },
    { code: "+686", name: "Micronesia", pattern: /^\d{7}$/ },
    { code: "+687", name: "Marshall Islands", pattern: /^\d{7}$/ },
    { code: "+688", name: "Samoa", pattern: /^\d{7}$/ },
    { code: "+689", name: "Yap", pattern: /^\d{6}$/ },
    { code: "+690", name: "Tokelau", pattern: /^\d{4}$/ },
    {
      code: "+691",
      name: "Federated States of Micronesia",
      pattern: /^\d{7}$/,
    },
    { code: "+850", name: "North Korea", pattern: /^\d{8}$/ },
    { code: "+852", name: "Hong Kong", pattern: /^\d{8}$/ },
    { code: "+853", name: "Macau", pattern: /^\d{8}$/ },
    { code: "+856", name: "Laos", pattern: /^\d{8}$/ },
    { code: "+880", name: "Bangladesh", pattern: /^\d{10}$/ },
    { code: "+886", name: "Taiwan", pattern: /^\d{9}$/ },
    { code: "+90", name: "Turkey", pattern: /^\d{10}$/ },
    { code: "+92", name: "Pakistan", pattern: /^\d{10}$/ },
    { code: "+93", name: "Afghanistan", pattern: /^\d{9}$/ },
    { code: "+94", name: "Sri Lanka", pattern: /^\d{9}$/ },
    { code: "+95", name: "Myanmar", pattern: /^\d{8}$/ },
    { code: "+960", name: "Maldives", pattern: /^\d{7}$/ },
    { code: "+961", name: "Lebanon", pattern: /^\d{8}$/ },
    { code: "+962", name: "Jordan", pattern: /^\d{9}$/ },
    { code: "+963", name: "Oman", pattern: /^\d{8}$/ },
    { code: "+964", name: "Yemen", pattern: /^\d{9}$/ },
    { code: "+965", name: "Kuwait", pattern: /^\d{8}$/ },
    { code: "+966", name: "Saudi Arabia", pattern: /^\d{9}$/ },
    { code: "+967", name: "UAE", pattern: /^\d{9}$/ },
    { code: "+968", name: "Bahrain", pattern: /^\d{8}$/ },
    { code: "+970", name: "Palestine", pattern: /^\d{9}$/ },
    { code: "+971", name: "UAE", pattern: /^\d{9}$/ },
    { code: "+972", name: "Morocco", pattern: /^\d{9}$/ },
    { code: "+973", name: "Algeria", pattern: /^\d{9}$/ },
    { code: "+974", name: "Tunisia", pattern: /^\d{8}$/ },
    { code: "+975", name: "Western Sahara", pattern: /^\d{9}$/ },
    { code: "+212", name: "Morocco", pattern: /^\d{9}$/ },
    { code: "+213", name: "Algeria", pattern: /^\d{9}$/ },
    { code: "+216", name: "Tunisia", pattern: /^\d{8}$/ },
    { code: "+218", name: "Libya", pattern: /^\d{9}$/ },
    { code: "+220", name: "Gambia", pattern: /^\d{7}$/ },
    { code: "+221", name: "Senegal", pattern: /^\d{9}$/ },
    { code: "+222", name: "Mauritania", pattern: /^\d{8}$/ },
    { code: "+223", name: "Mali", pattern: /^\d{8}$/ },
    { code: "+224", name: "Guinea", pattern: /^\d{9}$/ },
    { code: "+225", name: "Burkina Faso", pattern: /^\d{8}$/ },
    { code: "+226", name: "Niger", pattern: /^\d{8}$/ },
    { code: "+227", name: "Togo", pattern: /^\d{8}$/ },
    { code: "+228", name: "Côte d'Ivoire", pattern: /^\d{10}$/ },
    { code: "+229", name: "Benin", pattern: /^\d{8}$/ },
    { code: "+230", name: "Mauritius", pattern: /^\d{7}$/ },
    { code: "+231", name: "Liberia", pattern: /^\d{7}$/ },
    { code: "+232", name: "Sierra Leone", pattern: /^\d{8}$/ },
    { code: "+233", name: "Ghana", pattern: /^\d{9}$/ },
    { code: "+234", name: "Nigeria", pattern: /^\d{10}$/ },
    { code: "+235", name: "Chad", pattern: /^\d{8}$/ },
    { code: "+236", name: "Central African Republic", pattern: /^\d{8}$/ },
    { code: "+237", name: "Congo", pattern: /^\d{9}$/ },
    { code: "+238", name: "São Tomé & Príncipe", pattern: /^\d{7}$/ },
    { code: "+239", name: "Equatorial Guinea", pattern: /^\d{6}$/ },
    { code: "+240", name: "Gabon", pattern: /^\d{7}$/ },
    { code: "+241", name: "Gabon", pattern: /^\d{7}$/ },
    { code: "+242", name: "Congo (DRC)", pattern: /^\d{9}$/ },
    { code: "+243", name: "Congo (Republic)", pattern: /^\d{7}$/ },
    { code: "+244", name: "Guinea-Bissau", pattern: /^\d{7}$/ },
    { code: "+245", name: "Guinea", pattern: /^\d{9}$/ },
    { code: "+246", name: "Diego Garcia", pattern: /^\d{6}$/ },
    { code: "+247", name: "Ascension", pattern: /^\d{4}$/ },
    { code: "+248", name: "Seychelles", pattern: /^\d{7}$/ },
    { code: "+249", name: "Sudan", pattern: /^\d{9}$/ },
    { code: "+250", name: "Rwanda", pattern: /^\d{9}$/ },
    { code: "+251", name: "Ethiopia", pattern: /^\d{9}$/ },
    { code: "+252", name: "Somalia", pattern: /^\d{8}$/ },
    { code: "+253", name: "Djibouti", pattern: /^\d{6}$/ },
    { code: "+254", name: "Kenya", pattern: /^\d{9}$/ },
    { code: "+255", name: "Tanzania", pattern: /^\d{9}$/ },
    { code: "+256", name: "Uganda", pattern: /^\d{9}$/ },
    { code: "+257", name: "Burundi", pattern: /^\d{8}$/ },
    { code: "+258", name: "Mozambique", pattern: /^\d{9}$/ },
    { code: "+260", name: "Zambia", pattern: /^\d{9}$/ },
    { code: "+261", name: "Zimbabwe", pattern: /^\d{9}$/ },
    { code: "+262", name: "Madagascar", pattern: /^\d{9}$/ },
    { code: "+263", name: "Mayotte", pattern: /^\d{9}$/ },
    { code: "+264", name: "Reunion", pattern: /^\d{9}$/ },
    { code: "+265", name: "Botswana", pattern: /^\d{7}$/ },
    { code: "+266", name: "Lesotho", pattern: /^\d{8}$/ },
    { code: "+267", name: "Namibia", pattern: /^\d{9}$/ },
    { code: "+268", name: "Swaziland", pattern: /^\d{8}$/ },
    { code: "+269", name: "Comoros", pattern: /^\d{7}$/ },
    { code: "+290", name: "Saint Helena", pattern: /^\d{4}$/ },
    { code: "+291", name: "Eritrea", pattern: /^\d{7}$/ },
    { code: "+297", name: "Aruba", pattern: /^\d{7}$/ },
    { code: "+298", name: "Faroe Islands", pattern: /^\d{6}$/ },
    { code: "+299", name: "Greenland", pattern: /^\d{6}$/ },
  ];

  // Profile state
  const [profileData, setProfileData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    bio: "",
    phone: "",
    country_code: "+1", // Default to US
  });

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] =
    useState<string>("");
  const profilePictureRef = useRef<HTMLInputElement>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserCreationError(null);
    setIsCreatingUser(true);

    try {
      // Validate email format before sending to backend
      if (!validateEmail(currentUser.email)) {
        setUserCreationError("Please enter a valid email address");
        setIsCreatingUser(false);
        return;
      }
      if (isEditing) {
        // Handle update user - only send changed fields for partial editing
        const originalUser = users.find((u) => u.id === currentUser.id);
        const updateData: any = {};

        // Compare and only include changed fields
        if (
          originalUser &&
          originalUser.first_name !== currentUser.first_name
        ) {
          updateData.first_name = currentUser.first_name;
        }
        if (originalUser && originalUser.last_name !== currentUser.last_name) {
          updateData.last_name = currentUser.last_name;
        }
        if (originalUser && originalUser.email !== currentUser.email) {
          updateData.email = currentUser.email;
        }

        // Handle phone number comparison
        const currentPhone = `${currentUser.country_code}${currentUser.phone}`;
        const originalPhone = originalUser?.profile?.phone || "";
        if (currentPhone !== originalPhone) {
          updateData.phone = currentPhone;
        }

        if (originalUser && originalUser.role !== currentUser.role) {
          updateData.role = currentUser.role;
        }
        if (
          originalUser &&
          originalUser.storage_quota !== currentUser.storage_quota
        ) {
          updateData.storage_quota = currentUser.storage_quota;
        }

        console.log("Updating user:", currentUser.id, updateData);
        await authService.editUser(currentUser.id, updateData);

        // Refresh users list after successful update
        const usersData = await authService.getUsers();
        const transformedUsers = usersData.map((user: any) => ({
          id: user.id,
          name:
            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
            user.username,
          email: user.email,
          role: user.role,
          firstName: user.first_name || "",
          lastName: user.last_name || "",
          phone: user.profile?.phone || "",
          storageQuota: user.storage_quota
            ? Math.round(user.storage_quota / 1073741824)
            : 0,
          canCreate: user.role !== "Finance",
        }));
        setUsers(transformedUsers);
      } else {
        // Handle add new user - use the admin createUser API
        const userData = {
          username: currentUser.username,
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          email: currentUser.email,
          phone: `${currentUser.country_code}${currentUser.phone}`,
          role: currentUser.role,
          storage_quota: currentUser.storage_quota,
          password: currentUser.password,
          password2: currentUser.password2,
        };
        console.log("Adding new user:", userData);
        await authService.createUser(userData);

        // Refresh users list after successful creation
        const usersData = await authService.getUsers();
        const transformedUsers = usersData.map((user: any) => ({
          id: user.id,
          name:
            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
            user.username,
          email: user.email,
          role: user.role,
          firstName: user.first_name || "",
          lastName: user.last_name || "",
          phone: user.profile?.phone || "",
          storageQuota: user.storage_quota
            ? Math.round(user.storage_quota / 1073741824)
            : 0,
          canCreate: user.role !== "Finance",
        }));
        setUsers(transformedUsers);
      }

      // Set success message and close dialog
      const successMsg = isEditing
        ? "User updated successfully!"
        : "User created successfully!";
      setSuccessMessage(successMsg);
      setUserDialogOpen(false);
      setCurrentUser({
        id: 0,
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        country_code: "+1",
        role: "Project Manager",
        storage_quota: 1000,
        password: "",
        password2: "",
        canCreate: false,
      });
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error("Error creating/updating user:", error);

      // Extract meaningful error message
      let errorMessage = isEditing
        ? "Failed to update user. Please try again."
        : "Failed to create user. Please try again.";
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors[0];
        } else if (errorData.username) {
          errorMessage = `Username: ${errorData.username[0]}`;
        } else if (errorData.email) {
          errorMessage = `Email: ${errorData.email[0]}`;
        } else if (errorData.password) {
          errorMessage = `Password: ${errorData.password[0]}`;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setUserCreationError(errorMessage);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditUser = async (user: any) => {
    try {
      // Fetch detailed user data from database
      const userDetails = await authService.getUserDetail(user.id);

      // Parse phone number to extract country code and local number
      let phoneNumber = userDetails.profile?.phone || "";
      let countryCode = "+1"; // Default
      let localNumber = "";

      if (phoneNumber) {
        // Try to extract country code from phone number
        const foundCountry = countryPhoneCodes.find((country) =>
          phoneNumber.startsWith(country.code),
        );

        if (foundCountry) {
          countryCode = foundCountry.code;
          localNumber = phoneNumber.replace(foundCountry.code, "").trim();
        } else {
          localNumber = phoneNumber;
        }
      }

      setCurrentUser({
        id: userDetails.id,
        username: userDetails.username,
        first_name: userDetails.first_name || "",
        last_name: userDetails.last_name || "",
        email: userDetails.email,
        phone: localNumber,
        country_code: countryCode,
        role: userDetails.role,
        storage_quota: userDetails.storage_quota || 1000,
        password: "", // Reset password field when editing
        password2: "",
        canCreate: user.canCreate,
      });

      setIsEditing(true);
      setUserDialogOpen(true);
    } catch (error) {
      console.error("Error fetching user details for editing:", error);
      // Fallback to basic user data from list
      let phoneNumber = user.profile?.phone || "";
      let countryCode = "+1";
      let localNumber = "";

      if (phoneNumber) {
        const foundCountry = countryPhoneCodes.find((country) =>
          phoneNumber.startsWith(country.code),
        );

        if (foundCountry) {
          countryCode = foundCountry.code;
          localNumber = phoneNumber.replace(foundCountry.code, "").trim();
        } else {
          localNumber = phoneNumber;
        }
      }

      setCurrentUser({
        id: user.id,
        username: user.username,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email,
        phone: localNumber,
        country_code: countryCode,
        role: user.role,
        storage_quota: user.storage_quota || 1000,
        password: "",
        password2: "",
        canCreate: user.canCreate,
      });

      setIsEditing(true);
      setUserDialogOpen(true);
    }
  };

  const handleDeleteUser = (user: any) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await authService.deleteUser(userToDelete.id);
      // Refresh users list after successful deletion
      const usersData = await authService.getUsers();
      const transformedUsers = usersData.map((user: any) => ({
        id: user.id,
        name:
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.username,
        email: user.email,
        role: user.role,
        canCreate: user.role !== "Finance",
      }));
      setUsers(transformedUsers);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      setDeleteDialogOpen(false);
      setUserToDelete(null);

      // Show error dialog with API error message
      let errorMsg = "Failed to delete user. Please try again.";
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      setErrorMessage(errorMsg);
      setErrorDialogOpen(true);
    }
  };

  const handleLogoChange = (
    type: LogoType,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreviews((prev) => ({
          ...prev,
          [type]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);

      if (type === "topLeft") {
        setTopLeftLogo(file);
      } else {
        setTopRightLogo(file);
      }
    }
  };

  const removeLogo = (type: LogoType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === "topLeft") {
      setTopLeftLogo(null);
    } else {
      setTopRightLogo(null);
    }
    setLogoPreviews((prev) => {
      const newPreviews = { ...prev };
      delete newPreviews[type];
      return newPreviews;
    });
  };

  const handleProfilePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setProfilePicture(file);
    }
  };

  const removeProfilePicture = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProfilePicture(null);
    setProfilePicturePreview("");
  };

  const handleDeleteProfilePicture = async () => {
    try {
      await authService.deleteProfilePicture();
      setProfilePicture(null);
      setProfilePicturePreview("");
      // Also clear the file input
      if (profilePictureRef.current) {
        profilePictureRef.current.value = "";
      }
    } catch (error) {
      console.error("Error deleting profile picture:", error);
    }
  };

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoadingProfile(true);
      try {
        const profileResponse: ProfileData = await authService.getProfile();

        // Parse phone number to extract country code and local number
        let phoneNumber = profileResponse.profile?.phone || "";
        let countryCode = "+1"; // Default
        let localNumber = "";

        if (phoneNumber) {
          // Try to extract country code from phone number
          const foundCountry = countryPhoneCodes.find((country) =>
            phoneNumber.startsWith(country.code),
          );

          if (foundCountry) {
            countryCode = foundCountry.code;
            localNumber = phoneNumber.replace(foundCountry.code, "").trim();
          } else {
            localNumber = phoneNumber;
          }
        }

        const newProfileData = {
          username: profileResponse.username,
          email: profileResponse.email,
          first_name: profileResponse.first_name || "",
          last_name: profileResponse.last_name || "",
          bio: profileResponse.profile?.bio || "",
          phone: localNumber,
          country_code: countryCode,
        };

        setProfileData(newProfileData);

        // Set profile picture if available
        if (profileResponse.profile?.picture_url) {
          try {
            const profilePictureUrl = await authService.getProfilePicture();
            if (profilePictureUrl) {
              setProfilePicturePreview(profilePictureUrl);
            } else {
              setProfilePicturePreview("");
            }
          } catch (error) {
            console.error("Error loading profile picture:", error);
            setProfilePicturePreview("");
          }
        } else {
          // Clear preview if no profile picture exists
          setProfilePicturePreview("");
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfileData();
  }, []);

  // Phone validation function
  const validatePhoneNumber = (phone: string, countryCode: string): boolean => {
    const country = countryPhoneCodes.find((c) => c.code === countryCode);
    if (!country) return true; // Skip validation if country not found

    return country.pattern.test(phone);
  };

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      // Validate phone number based on selected country
      if (
        profileData.phone &&
        !validatePhoneNumber(profileData.phone, profileData.country_code)
      ) {
        alert(
          `Invalid phone number format for ${countryPhoneCodes.find((c) => c.code === profileData.country_code)?.name}. Please check the format.`,
        );
        setIsUpdatingProfile(false);
        return;
      }

      // Prepare update data - only send non-empty fields
      const updateData: {
        first_name?: string;
        last_name?: string;
        email?: string;
        bio?: string;
        phone?: string;
      } = {};

      if (profileData.first_name.trim())
        updateData.first_name = profileData.first_name;
      if (profileData.last_name.trim())
        updateData.last_name = profileData.last_name;
      if (profileData.email.trim()) updateData.email = profileData.email;
      if (profileData.bio.trim()) updateData.bio = profileData.bio;

      // Format phone number with country code for API
      if (profileData.phone.trim()) {
        updateData.phone = `${profileData.country_code}${profileData.phone.trim()}`;
      }

      // Call API to update profile
      const updatedProfile = await authService.updateProfile(updateData);

      // Update local state with response
      setProfileData({
        username: updatedProfile.username,
        email: updatedProfile.email,
        first_name: updatedProfile.first_name || "",
        last_name: updatedProfile.last_name || "",
        bio: updatedProfile.profile?.bio || "",
        phone: profileData.phone, // Keep local number for display
        country_code: profileData.country_code,
      });

      // Handle profile picture upload if there's a new one
      if (profilePicture) {
        // Validate file format and size
        const allowedFormats = ["jpg", "jpeg", "png", "gif", "webp"];
        const maxSize = 5 * 1024 * 1024; // 5MB

        // Get file extension
        const fileExtension = profilePicture.name
          .split(".")
          .pop()
          ?.toLowerCase();

        if (!fileExtension || !allowedFormats.includes(fileExtension)) {
          alert(
            "Invalid file format. Allowed formats: jpg, jpeg, png, gif, webp",
          );
          setIsUpdatingProfile(false);
          return;
        }

        if (profilePicture.size > maxSize) {
          alert("File size too large. Maximum size: 5MB");
          setIsUpdatingProfile(false);
          return;
        }

        // Upload profile picture
        await authService.uploadProfilePicture(profilePicture);

        // Update profile picture preview with authenticated fetch
        try {
          const profilePictureUrl = await authService.getProfilePicture();
          if (profilePictureUrl) {
            setProfilePicturePreview(profilePictureUrl);
          } else {
            setProfilePicturePreview("");
          }
        } catch (error) {
          console.error("Error loading updated profile picture:", error);
          setProfilePicturePreview("");
        }
        setProfilePicture(null);
      }

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };
  return (
    <div className="flex-1 overflow-auto">
      <PageHeader title="Settings" />

      <div className="p-6">
        <Card className="border border-border shadow-sm">
          <Tabs
            defaultValue={isAdmin ? "organization" : "profile"}
            className="w-full"
          >
            <div className="border-b border-border">
              <TabsList className="w-full justify-start rounded-none bg-transparent p-0">
                {isAdmin && (
                  <TabsTrigger
                    value="organization"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                  >
                    Organization Details
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="forms"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  Forms Details
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger
                    value="users"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                  >
                    Users
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="profile"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  My Profile
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger
                    value="subscription"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                  >
                    Subscription
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {isAdmin && (
              <TabsContent value="organization" className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input id="org-name" placeholder="Azuum Corporation" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-email">Super Admin Email</Label>
                    <Input
                      id="org-email"
                      type="email"
                      placeholder="admin@azuum.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-address">Address</Label>
                  <Textarea
                    id="org-address"
                    placeholder="Enter organization address"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Top-Left Logo</Label>
                    <input
                      type="file"
                      ref={fileInputRefs.topLeft}
                      onChange={(e) => handleLogoChange("topLeft", e)}
                      accept="image/*"
                      className="hidden"
                    />
                    <div
                      className="border-2 border-dashed border-border rounded p-4 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => fileInputRefs.topLeft.current?.click()}
                    >
                      {logoPreviews.topLeft ? (
                        <div className="relative">
                          <img
                            src={logoPreviews.topLeft}
                            alt="Top Left Logo Preview"
                            className="max-h-32 mx-auto"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 rounded-full h-6 w-6"
                            onClick={(e) => removeLogo("topLeft", e)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload organization logo
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Recommended size: 200x50px
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Top-Right Logo (Optional)</Label>
                    <input
                      type="file"
                      ref={fileInputRefs.topRight}
                      onChange={(e) => handleLogoChange("topRight", e)}
                      accept="image/*"
                      className="hidden"
                    />
                    <div
                      className="border-2 border-dashed border-border rounded p-4 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => fileInputRefs.topRight.current?.click()}
                    >
                      {logoPreviews.topRight ? (
                        <div className="relative">
                          <img
                            src={logoPreviews.topRight}
                            alt="Top Right Logo Preview"
                            className="max-h-32 mx-auto"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 rounded-full h-6 w-6"
                            onClick={(e) => removeLogo("topRight", e)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload partner logo
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Recommended size: 200x50px
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="change-password">Change Password</Label>
                  <Input id="change-password" type="password" />
                </div>

                <Button>Save Changes</Button>
              </TabsContent>
            )}

            <TabsContent value="forms" className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  placeholder="Enter terms and conditions that will appear at the bottom of all forms"
                  rows={8}
                />
              </div>
              <Button>Save Changes</Button>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="users" className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-foreground">
                    User Management
                  </h3>
                  <Dialog
                    open={userDialogOpen}
                    onOpenChange={(open) => {
                      setUserDialogOpen(open);
                      if (!open) {
                        setIsEditing(false);
                        setCurrentUser({
                          id: 0,
                          username: "",
                          first_name: "",
                          last_name: "",
                          email: "",
                          phone: "",
                          country_code: "+1",
                          role: "Project Manager",
                          storage_quota: 1000,
                          password: "",
                          password2: "",
                          canCreate: false,
                        });
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button onClick={() => setUserDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add New User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {isEditing ? "Edit User" : "Add New User"}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleUserSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">
                            Username <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="username"
                            value={currentUser.username}
                            onChange={(e) =>
                              setCurrentUser({
                                ...currentUser,
                                username: e.target.value,
                              })
                            }
                            placeholder="Enter username"
                            required
                            disabled={isEditing}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="first_name">
                              First Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="first_name"
                              value={currentUser.first_name}
                              onChange={(e) =>
                                setCurrentUser({
                                  ...currentUser,
                                  first_name: e.target.value,
                                })
                              }
                              placeholder="First name"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="last_name">
                              Last Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="last_name"
                              value={currentUser.last_name}
                              onChange={(e) =>
                                setCurrentUser({
                                  ...currentUser,
                                  last_name: e.target.value,
                                })
                              }
                              placeholder="Last name"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">
                            Email <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={currentUser.email}
                            onChange={(e) =>
                              setCurrentUser({
                                ...currentUser,
                                email: e.target.value,
                              })
                            }
                            placeholder="Enter email address"
                            required
                            onInvalid={(e) => {
                              const target = e.target as HTMLInputElement;
                              if (!validateEmail(target.value)) {
                                target.setCustomValidity(
                                  "Please enter a valid email address",
                                );
                              }
                            }}
                            onInput={(e) => {
                              const target = e.target as HTMLInputElement;
                              if (validateEmail(target.value)) {
                                target.setCustomValidity("");
                              }
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">
                            Phone Number <span className="text-red-500">*</span>
                          </Label>
                          <div className="flex gap-2">
                            <select
                              value={currentUser.country_code}
                              onChange={(e) =>
                                setCurrentUser({
                                  ...currentUser,
                                  country_code: e.target.value,
                                })
                              }
                              className="w-24 p-2 border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                              required
                            >
                              {countryPhoneCodes.map((country) => (
                                <option key={country.code} value={country.code}>
                                  {country.code}
                                </option>
                              ))}
                            </select>
                            <Input
                              id="phone"
                              type="tel"
                              value={currentUser.phone}
                              onChange={(e) =>
                                setCurrentUser({
                                  ...currentUser,
                                  phone: e.target.value,
                                })
                              }
                              placeholder="1234567890"
                              required
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="role">
                            Role <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={currentUser.role}
                            onValueChange={(value) =>
                              setCurrentUser({ ...currentUser, role: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">
                                Super Admin
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="storage_quota">
                            Storage Quota (MB){" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="storage_quota"
                            type="number"
                            value={currentUser.storage_quota}
                            onChange={(e) =>
                              setCurrentUser({
                                ...currentUser,
                                storage_quota: parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="1000"
                            required
                          />
                        </div>

                        {!isEditing && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="password">
                                Password <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="password"
                                type="password"
                                value={currentUser.password}
                                onChange={(e) =>
                                  setCurrentUser({
                                    ...currentUser,
                                    password: e.target.value,
                                  })
                                }
                                placeholder="Enter password"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="password2">
                                Confirm Password{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="password2"
                                type="password"
                                value={currentUser.password2}
                                onChange={(e) =>
                                  setCurrentUser({
                                    ...currentUser,
                                    password2: e.target.value,
                                  })
                                }
                                placeholder="Confirm password"
                                required
                              />
                            </div>
                          </>
                        )}

                        {isEditing && (
                          <div className="flex items-center justify-between pt-2">
                            <Label htmlFor="canCreate" className="flex-1">
                              Can Create Forms
                            </Label>
                            <Switch
                              id="canCreate"
                              checked={currentUser.canCreate}
                              onCheckedChange={(checked) =>
                                setCurrentUser({
                                  ...currentUser,
                                  canCreate: checked,
                                })
                              }
                            />
                          </div>
                        )}
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setUserDialogOpen(false);
                              setIsEditing(false);
                              setUserCreationError(null);
                              setCurrentUser({
                                id: 0,
                                username: "",
                                first_name: "",
                                last_name: "",
                                email: "",
                                phone: "",
                                country_code: "+1",
                                role: "Project Manager",
                                storage_quota: 1000,
                                password: "",
                                password2: "",
                                canCreate: false,
                              });
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isCreatingUser}>
                            {isCreatingUser
                              ? "Creating User..."
                              : isEditing
                                ? "Update User"
                                : "Add User"}
                          </Button>
                        </div>
                      </form>

                      {/* Error popup */}
                      {userCreationError && (
                        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm">
                          <div className="flex items-center justify-between">
                            <span>{userCreationError}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserCreationError(null)}
                              className="h-auto p-1 text-destructive hover:bg-destructive/20"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Success Message */}
                {successMessage && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                    <div className="flex items-center justify-between">
                      <span>{successMessage}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSuccessMessage(null)}
                        className="h-auto p-1 text-green-700 hover:bg-green-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">
                      Loading users...
                    </div>
                  </div>
                ) : usersError ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-red-500">{usersError}</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>First Name</TableHead>
                        <TableHead>Last Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Storage (GB)</TableHead>
                        <TableHead>Can Create</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user, index) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.firstName}
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>{user.storageQuota}</TableCell>
                          <TableCell>
                            <Switch checked={user.canCreate} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditUser(user)}
                                    >
                                      <Edit className="h-3 w-3" />
                                      <span className="sr-only">Edit user</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit User</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <RotateCcw className="h-3 w-3" />
                                      <span className="sr-only">
                                        Reset password
                                      </span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Send Password Reset</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => handleDeleteUser(user)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span className="sr-only">
                                        Delete user
                                      </span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete User</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            )}

            <TabsContent value="profile" className="p-6 space-y-6">
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {isLoadingProfile ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">
                      Loading profile data...
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={profileData.username}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              username: e.target.value,
                            })
                          }
                          placeholder="Enter username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              email: e.target.value,
                            })
                          }
                          placeholder="Enter email address"
                          onInvalid={(e) => {
                            const target = e.target as HTMLInputElement;
                            if (!validateEmail(target.value)) {
                              target.setCustomValidity(
                                "Please enter a valid email address",
                              );
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          value={profileData.first_name}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              first_name: e.target.value,
                            })
                          }
                          placeholder="Enter first name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={profileData.last_name}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              last_name: e.target.value,
                            })
                          }
                          placeholder="Enter last name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <div className="flex gap-2">
                        <Select
                          value={profileData.country_code}
                          onValueChange={(value) =>
                            setProfileData({
                              ...profileData,
                              country_code: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {countryPhoneCodes.map((country) => (
                              <SelectItem
                                key={country.code}
                                value={country.code}
                              >
                                {country.code} ({country.name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              phone: e.target.value,
                            })
                          }
                          placeholder="Phone number"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            bio: e.target.value,
                          })
                        }
                        placeholder="Tell us about yourself"
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Profile Picture</Label>
                      <input
                        type="file"
                        ref={profilePictureRef}
                        onChange={handleProfilePictureChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <div
                        className="border-2 border-dashed border-border rounded p-4 text-center cursor-pointer hover:bg-accent/50 transition-colors max-w-xs"
                        onClick={() => profilePictureRef.current?.click()}
                      >
                        {profilePicturePreview ? (
                          <div className="relative">
                            <img
                              src={profilePicturePreview}
                              alt="Profile Picture"
                              className="w-24 h-24 rounded-full mx-auto object-cover"
                              onError={(e) => {
                                console.error(
                                  "Error loading profile picture:",
                                  e,
                                );
                                setProfilePicturePreview("");
                              }}
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="rounded-full h-6 w-6"
                                onClick={(e) => removeProfilePicture(e)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteProfilePicture}
                                disabled={isUpdatingProfile}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-24 h-24 rounded-full mx-auto bg-muted flex items-center justify-center">
                              <User className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              No profile picture
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Click to upload profile picture
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Recommended size: 200x200px
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button type="submit" disabled={isUpdatingProfile}>
                      {isUpdatingProfile ? "Saving..." : "Save Profile"}
                    </Button>
                  </>
                )}
              </form>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="subscription" className="p-6">
                <Card className="p-6 border border-border bg-muted/30">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          Professional Plan
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Full access to all features
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-primary">
                        $99/mo
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Expiry Date
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          Dec 31, 2024
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Days Remaining
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          45 days
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="text-lg font-semibold text-green-600">
                          Active
                        </p>
                      </div>
                    </div>

                    <Button className="mt-4">Renew Subscription</Button>
                  </div>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-center">
                Confirm Delete User
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <p className="text-lg mb-2">
                Are you sure you want to delete user "{userToDelete?.name}"?
              </p>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center space-x-4 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setUserToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteUser}>
                Delete User
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Error Dialog */}
        <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-center text-red-600">
                Error
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <p className="text-lg">{errorMessage}</p>
            </div>
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => {
                  setErrorDialogOpen(false);
                  setErrorMessage("");
                }}
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Settings;
