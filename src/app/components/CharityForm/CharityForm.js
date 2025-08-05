import React, { useState } from 'react';

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
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>
          Name:
          <input
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>
        {errors.name && <div style={{ color: 'red' }}>{errors.name}</div>}
      </div>
      <div>
        <label>
          Description:
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
          />
        </label>
        {errors.description && <div style={{ color: 'red' }}>{errors.description}</div>}
      </div>
      <div>
        <label>
          Donation Address:
          <input
            name="donationAddress"
            type="text"
            value={form.donationAddress}
            onChange={handleChange}
            required
          />
        </label>
        {errors.donationAddress && <div style={{ color: 'red' }}>{errors.donationAddress}</div>}
      </div>
      <button type="submit">{submitLabel}</button>
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
    <div>
      <h2>Add a Charity</h2>
      <CharityForm onSubmit={handleFormSubmit} />
      </div>
  );
}