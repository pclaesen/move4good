import React, { useState } from 'react';
import './CharityForm.css';

// Standalone, reusable form component
export function CharityForm({ onSubmit, initialValues = {}, submitLabel = "Add Charity" }) {
  const [form, setForm] = useState({
    name: initialValues.name || '',
    description: initialValues.description || '',
    donationAddress: initialValues.donationAddress || '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.donationAddress.trim()) newErrors.donationAddress = 'Donation Address is required';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    if (onSubmit) onSubmit(form);
    // Reset form after successful submission
    setForm({
      name: '',
      description: '',
      donationAddress: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="charity-form">
      <div className="form-group">
        <label className="form-label">
          Charity Name
        </label>
        <input
          name="name"
          type="text"
          className={`form-input ${errors.name ? 'error' : ''}`}
          value={form.name}
          onChange={handleChange}
          placeholder="Enter charity name"
          required
        />
        {errors.name && <div className="error-message">{errors.name}</div>}
      </div>

      <div className="form-group">
        <label className="form-label">
          Description
        </label>
        <textarea
          name="description"
          className={`form-textarea ${errors.description ? 'error' : ''}`}
          value={form.description}
          onChange={handleChange}
          placeholder="Describe what this charity does and its mission"
          rows="4"
          required
        />
        {errors.description && <div className="error-message">{errors.description}</div>}
      </div>

      <div className="form-group">
        <label className="form-label">
          Donation Address/URL
        </label>
        <input
          name="donationAddress"
          type="text"
          className={`form-input ${errors.donationAddress ? 'error' : ''}`}
          value={form.donationAddress}
          onChange={handleChange}
          placeholder="Enter website URL or donation address"
          required
        />
        {errors.donationAddress && <div className="error-message">{errors.donationAddress}</div>}
      </div>

      <button type="submit" className="form-submit-btn">
        {submitLabel}
      </button>
    </form>
  );
}

// Example function to use the form and handle input data
export function CharityFormPage({ onCharityAdded }) {
  const handleFormSubmit = (data) => {
    // You can replace this with your own logic (e.g., API call)
    if (onCharityAdded) onCharityAdded(data);
    alert(`Charity Added:\n${JSON.stringify(data, null, 2)}`);
  };

  return (
    <div className="charity-form-page">
      <h2>Add a Charity</h2>
      <CharityForm onSubmit={handleFormSubmit} />
    </div>
  );
}