# Azuum Form Hub Backend API

A Django REST Framework backend for the Azuum Form Hub application, providing comprehensive form management, user authentication, and submission handling.

## Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Form Management**: Create, edit, publish, and archive forms with dynamic fields
- **Form Submissions**: Handle form submissions with PDF generation
- **Role-Based Permissions**: Super Admin, Admin, Manager, Program, Finance, and User roles
- **API Documentation**: Swagger/OpenAPI documentation

## Tech Stack

- **Backend**: Django 5.2.8
- **API Framework**: Django REST Framework
- **Authentication**: JWT (Simple JWT)
- **Database**: SQLite (development), PostgreSQL (production)
- **Documentation**: drf-yasg (Swagger/OpenAPI)
- **PDF Generation**: ReportLab

## Setup Instructions

### Prerequisites

- Python 3.8+
- Virtual environment (recommended)

### Installation

1. **Clone and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Mac/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run database migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create superuser (optional):**
   ```bash
   python manage.py createsuperuser
   ```

6. **Start development server:**
   ```bash
   python manage.py runserver
   ```

The API will be available at `http://localhost:8000`

## API Documentation

- **Swagger UI**: `http://localhost:8000/api/docs/`
- **ReDoc**: `http://localhost:8000/api/redoc/`

## API Endpoints

### Authentication

- `POST /api/accounts/login/` - User login
- `POST /api/accounts/register/` - User registration
- `GET /api/accounts/profile/` - Get user profile
- `POST /api/token/` - Obtain JWT token
- `POST /api/token/refresh/` - Refresh JWT token

### Forms Management

- `GET /api/forms/forms/` - List forms (filtered by user role)
- `POST /api/forms/forms/` - Create new form
- `GET /api/forms/forms/{id}/` - Get form details
- `PUT /api/forms/forms/{id}/` - Update form
- `DELETE /api/forms/forms/{id}/` - Delete form
- `POST /api/forms/forms/{id}/publish/` - Publish form
- `POST /api/forms/forms/{id}/archive/` - Archive form
- `GET /api/forms/forms/{id}/clone/` - Clone form

### Form Submissions

- `GET /api/submissions/submissions/` - List submissions (filtered by user role)
- `POST /api/submissions/submissions/` - Submit form
- `GET /api/submissions/submissions/{id}/` - Get submission details
- `POST /api/submissions/submissions/{id}/generate_pdf/` - Generate PDF
- `GET /api/submissions/submissions/{id}/download_pdf/` - Download PDF
- `GET /api/submissions/submissions/my_submissions/` - Get current user's submissions

## User Roles and Permissions

### Role Hierarchy

1. **Super Admin**: Full access to all features
2. **Admin**: Can see all forms and submissions
3. **Manager**: Can see all forms and submissions
4. **Program**: Can create and submit forms
5. **Finance**: Can create and submit forms
6. **Normal User**: Can only see own forms and submissions

### Access Control

- **Forms**: Admins/Managers see all forms, others see only their own
- **Submissions**: Admins/Managers see all submissions, others see only their own
- **Form Creation**: Available to Manager, Program, Finance, Admin, Super Admin
- **Form Submission**: Available to all authenticated users

## Data Models

### User Model

```python
{
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",  // super_admin, admin, manager, program, finance, user
    "created_at": "2024-01-01T00:00:00Z"
}
```

### Form Model

```python
{
    "id": 1,
    "title": "Contact Form",
    "description": "A simple contact form",
    "status": "published",  // draft, published, archived
    "creator": 1,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "fields": [
        {
            "id": 1,
            "label": "Name",
            "field_type": "text",
            "required": true,
            "placeholder": "Enter your name",
            "order": 1
        }
    ]
}
```

### Submission Model

```python
{
    "id": 1,
    "form": 1,
    "submitter": 1,
    "data": {
        "Name": "John Doe",
        "Email": "john@example.com"
    },
    "submitted_at": "2024-01-01T00:00:00Z"
}
```

## Testing

Run the test suite:

```bash
python manage.py test
```

Run tests for specific app:

```bash
python manage.py test accounts
python manage.py test forms
python manage.py test submissions
```

## Development

### Adding New Fields to Forms

The system supports the following field types:
- `text` - Single line text input
- `textarea` - Multi-line text input
- `number` - Numeric input
- `email` - Email input with validation
- `date` - Date picker
- `datetime` - Date and time picker
- `select` - Dropdown selection
- `multiselect` - Multi-select dropdown
- `checkbox` - Checkbox input
- `radio` - Radio button group
- `file` - File upload

### Environment Variables

Create a `.env` file in the backend directory:

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///db.sqlite3
```

## Production Deployment

1. **Set DEBUG=False** in settings
2. **Configure production database** (PostgreSQL recommended)
3. **Set ALLOWED_HOSTS** appropriately
4. **Configure static files serving**
5. **Set up HTTPS**
6. **Configure CORS for frontend domain**

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the BSD License.
