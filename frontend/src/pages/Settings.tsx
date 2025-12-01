import { useState, useRef, ChangeEvent } from "react";
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

const mockUsers = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@azuum.com",
    role: "Project Manager",
    canCreate: true,
    accessOps: true,
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "michael.chen@azuum.com",
    role: "Project Manager",
    canCreate: true,
  },
];

const Settings = () => {
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: 0,
    name: "",
    email: "",
    password: "",
    role: "Project Manager",
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

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      // Handle update user
      console.log("Updating user:", currentUser);
    } else {
      // Handle add new user
      console.log("Adding new user:", currentUser);
    }

    // Close dialog and reset form
    setUserDialogOpen(false);
    setCurrentUser({
      id: 0,
      name: "",
      email: "",
      password: "",
      role: "Project Manager",
      canCreate: false,
    });
    setIsEditing(false);
  };

  const handleEditUser = (user: (typeof mockUsers)[0]) => {
    setCurrentUser({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "", // Reset password field when editing
      role: user.role,
      canCreate: user.canCreate,
    });
    setIsEditing(true);
    setUserDialogOpen(true);
  };

  const handleLogoChange = (
    type: LogoType,
    event: ChangeEvent<HTMLInputElement>
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
  return (
    <div className="flex-1 overflow-auto">
      <PageHeader title="Settings" />

      <div className="p-6">
        <Card className="border border-border shadow-sm">
          <Tabs defaultValue="organization" className="w-full">
            <div className="border-b border-border">
              <TabsList className="w-full justify-start rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="organization"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  Organization Details
                </TabsTrigger>
                <TabsTrigger
                  value="forms"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  Forms Details
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  Users
                </TabsTrigger>
                <TabsTrigger
                  value="subscription"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  Subscription
                </TabsTrigger>
              </TabsList>
            </div>

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
                        name: "",
                        email: "",
                        role: "Project Manager",
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
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>
                        {isEditing ? "Edit User" : "Add New User"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUserSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={currentUser.name}
                          onChange={(e) =>
                            setCurrentUser({
                              ...currentUser,
                              name: e.target.value,
                            })
                          }
                          placeholder="Enter full name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
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
                          disabled={isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">
                          {isEditing
                            ? "New Password (leave blank to keep current)"
                            : "Password"}
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
                          placeholder={
                            isEditing
                              ? "Leave blank to keep current password"
                              : "Enter password"
                          }
                          required={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
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
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Program">Program</SelectItem>
                            <SelectItem value="Project Manager">
                              Project Manager
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
                            setCurrentUser({
                              id: 0,
                              name: "",
                              email: "",
                              role: "Project Manager",
                              canCreate: false,
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {isEditing ? "Update User" : "Add User"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Can Create</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
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

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span className="sr-only">Delete user</span>
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
            </TabsContent>

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
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
