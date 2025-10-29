# TODO: Add Leave Request Verification to Admin Dashboard

## Steps to Complete:
1. Modify AdminDashboard.jsx to fetch pending leave requests separately.
2. Add a new section in the dashboard UI to display pending leave requests with details (worker name, dates, reason).
3. Add approve and reject buttons for each pending leave request.
4. Implement API calls to approve/reject leave requests using existing backend routes.
5. Update the dashboard stats (pendingLeaves) after successful approval/rejection.
6. Handle loading states and errors for the actions.
7. Test the functionality to ensure it works correctly.

## Dependent Files:
- src/pages/admin/AdminDashboard.jsx (main file to edit)

## Followup Steps:
- Run the application and test the new leave request verification feature.
- Ensure notifications are sent to workers upon approval/rejection (already handled in backend).
