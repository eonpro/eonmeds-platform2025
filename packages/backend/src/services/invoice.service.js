const axios = require("axios");
const FormData = require("form-data");
const path = require("path");

class IntakeQClient {
  constructor(apiKey, apiUrl = "https://intakeq.com/api/v1") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.headers = {
      "X-Auth-Key": apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  // Test connection to IntakeQ API
  async testConnection() {
    try {
      // Try to get clients with limit 1 as a simple test
      const response = await axios.get(`${this.apiUrl}/clients`, {
        headers: this.headers,
        params: { limit: 1 },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  async createClient(clientData) {
    try {
      const response = await axios.post(`${this.apiUrl}/clients`, clientData, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error creating client:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async updateClient(clientId, updateData) {
    try {
      const response = await axios.put(
        `${this.apiUrl}/clients/${clientId}`,
        updateData,
        { headers: this.headers },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error updating client:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async createOrUpdateClient(clientData) {
    try {
      // First try to find existing client by email
      const searchResults = await this.searchClientByEmail(clientData.email);

      if (searchResults && searchResults.length > 0) {
        // Client exists, update it
        const existingClient = searchResults[0];
        const clientId = existingClient.Id;

        // Prepare update data
        const updateData = {
          FirstName: clientData.firstname,
          LastName: clientData.lastname,
          Email: clientData.email,
          Phone: clientData.phone,
          DateOfBirth: clientData.dob,
          Gender: clientData.gender,
          Address: `${clientData.address.house} ${clientData.address.street}`,
          AddressLine2: clientData.address.apartment,
          City: clientData.address.city,
          State: clientData.address.state,
          PostalCode: clientData.address.zip,
          Country: clientData.address.country,
        };

        await this.updateClient(clientId, updateData);
        return { success: true, clientId, isNew: false };
      } else {
        // Client doesn't exist, create new
        const createData = {
          FirstName: clientData.firstname,
          LastName: clientData.lastname,
          Email: clientData.email,
          Phone: clientData.phone,
          DateOfBirth: clientData.dob,
          Gender: clientData.gender,
          Address: `${clientData.address.house} ${clientData.address.street}`,
          AddressLine2: clientData.address.apartment,
          City: clientData.address.city,
          State: clientData.address.state,
          PostalCode: clientData.address.zip,
          Country: clientData.address.country,
        };

        const newClient = await this.createClient(createData);
        return { success: true, clientId: newClient.Id, isNew: true };
      }
    } catch (error) {
      console.error(
        "Error in createOrUpdateClient:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getClient(clientId) {
    try {
      const response = await axios.get(`${this.apiUrl}/clients/${clientId}`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error fetching client:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async createNote(noteData) {
    try {
      // IntakeQ uses treatment notes which are created through forms
      // To create a note, you need to:
      // 1. Have a treatment note form template created in IntakeQ
      // 2. Submit that form for the client
      // 3. Lock the form to make it a permanent note

      console.log("Note creation attempted:", noteData);
      console.log(
        "Note: IntakeQ requires treatment note forms to be created in the IntakeQ interface first",
      );
      console.log(
        "Then use the forms API to submit treatment notes for clients",
      );

      // For now, return a message indicating this limitation
      return {
        success: false,
        message:
          "Treatment notes require form templates. Please create a treatment note form in IntakeQ first.",
        suggestion:
          "Use the IntakeQ web interface to create a treatment note template, then use the forms API to submit it.",
        data: noteData,
      };
    } catch (error) {
      console.error(
        "Error creating note:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async uploadDocument(clientId, filePath, fileName, documentType = "Other") {
    try {
      const form = new FormData();
      form.append("file", require("fs").createReadStream(filePath), {
        filename: fileName,
        contentType: "application/pdf",
      });

      // IntakeQ uses /files/{clientId} endpoint for file uploads
      const response = await axios.post(
        `${this.apiUrl}/files/${clientId}`,
        form,
        {
          headers: {
            "X-Auth-Key": this.apiKey,
            ...form.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error uploading document:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async uploadPDF(clientId, pdfPath) {
    try {
      const fileName = path.basename(pdfPath);
      await this.uploadDocument(clientId, pdfPath, fileName, "IntakeForm");
      return true;
    } catch (error) {
      console.error("Error uploading PDF:", error.message);
      return false;
    }
  }

  async updateCustomFields(clientId, customFields) {
    try {
      // Get current client data
      const client = await this.getClient(clientId);

      // Merge custom fields
      const updatedFields = client.CustomFields || [];

      customFields.forEach((newField) => {
        const existingIndex = updatedFields.findIndex(
          (f) => f.Name === newField.Name,
        );
        if (existingIndex >= 0) {
          updatedFields[existingIndex] = newField;
        } else {
          updatedFields.push(newField);
        }
      });

      // Update client with new custom fields
      const response = await axios.put(
        `${this.apiUrl}/clients/${clientId}`,
        { CustomFields: updatedFields },
        { headers: this.headers },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error updating custom fields:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Search for clients by email
  async searchClientByEmail(email) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/clients?search=${encodeURIComponent(email)}`,
        { headers: this.headers },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error searching client:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Get forms
  async getForms() {
    try {
      const response = await axios.get(`${this.apiUrl}/forms`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error getting forms:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Send form to client
  async sendForm(clientId, formId) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/forms/send`,
        {
          ClientId: parseInt(clientId, 10),
          FormId: formId,
        },
        { headers: this.headers },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error sending form:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // ==================== INVOICE API METHODS ====================

  // Create a new invoice
  async createInvoice(invoiceData) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/invoices`,
        invoiceData,
        { headers: this.headers },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error creating invoice:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Get invoice by ID
  async getInvoice(invoiceId) {
    try {
      const response = await axios.get(`${this.apiUrl}/invoices/${invoiceId}`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error fetching invoice:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Update an existing invoice
  async updateInvoice(invoiceId, updateData) {
    try {
      const response = await axios.put(
        `${this.apiUrl}/invoices/${invoiceId}`,
        updateData,
        { headers: this.headers },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error updating invoice:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Delete an invoice
  async deleteInvoice(invoiceId) {
    try {
      const response = await axios.delete(
        `${this.apiUrl}/invoices/${invoiceId}`,
        { headers: this.headers },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error deleting invoice:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Send invoice to client
  async sendInvoice(invoiceId) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/invoices/${invoiceId}/send`,
        {},
        { headers: this.headers },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error sending invoice:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Query invoices with filters
  async queryInvoices(queryParams = {}) {
    try {
      const response = await axios.get(`${this.apiUrl}/invoices`, {
        headers: this.headers,
        params: queryParams,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error querying invoices:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Get invoices for a specific client
  async getClientInvoices(clientId) {
    try {
      return await this.queryInvoices({ clientId: parseInt(clientId, 10) });
    } catch (error) {
      console.error(
        "Error fetching client invoices:",
        error.response?.data || error.message,
      );
      return { error: error.message, invoices: [] };
    }
  }

  // Create invoice from template
  async createInvoiceFromTemplate(clientId, templateData) {
    try {
      const invoiceData = {
        ClientId: parseInt(clientId, 10),
        InvoiceDate: new Date().toISOString().split("T")[0],
        DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 30 days from now
        Status: "Unpaid",
        ...templateData,
      };

      return await this.createInvoice(invoiceData);
    } catch (error) {
      console.error(
        "Error creating invoice from template:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Mark invoice as paid
  async markInvoiceAsPaid(invoiceId, paymentData = {}) {
    try {
      const updateData = {
        Status: "Paid",
        PaidDate:
          paymentData.paidDate || new Date().toISOString().split("T")[0],
        PaymentMethod: paymentData.paymentMethod || "Other",
        ...paymentData,
      };

      return await this.updateInvoice(invoiceId, updateData);
    } catch (error) {
      console.error(
        "Error marking invoice as paid:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Get invoice summary for a client
  async getClientInvoiceSummary(clientId) {
    try {
      const invoices = await this.getClientInvoices(clientId);

      if (invoices.error) {
        return invoices;
      }

      const summary = {
        totalInvoices: invoices.length,
        totalAmount: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        paidInvoices: 0,
        unpaidInvoices: 0,
        overdueInvoices: 0,
      };

      const today = new Date();

      invoices.forEach((invoice) => {
        summary.totalAmount += invoice.TotalAmount || 0;

        if (invoice.Status === "Paid") {
          summary.paidInvoices++;
          summary.totalPaid += invoice.TotalAmount || 0;
        } else {
          summary.unpaidInvoices++;
          summary.totalOutstanding += invoice.TotalAmount || 0;

          if (invoice.DueDate && new Date(invoice.DueDate) < today) {
            summary.overdueInvoices++;
          }
        }
      });

      return summary;
    } catch (error) {
      console.error(
        "Error getting client invoice summary:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // ==================== CLIENT RETRIEVAL METHODS ====================

  // Get all clients with pagination
  async getAllClients(options = {}) {
    try {
      const limit = options.limit || 100; // Max per page
      const offset = options.offset || 0;
      const includeArchived = options.includeArchived || false;

      const params = {
        limit,
        offset,
      };

      if (!includeArchived) {
        params.status = "Active"; // Only get active clients
      }

      const response = await axios.get(`${this.apiUrl}/clients`, {
        headers: this.headers,
        params,
      });

      return response.data;
    } catch (error) {
      console.error(
        "Error fetching all clients:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Get all clients (handles pagination automatically)
  async fetchAllClients(includeArchived = false) {
    try {
      let allClients = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const batch = await this.getAllClients({
          limit,
          offset,
          includeArchived,
        });

        if (batch && batch.length > 0) {
          allClients = allClients.concat(batch);
          offset += batch.length;
          hasMore = batch.length === limit;
        } else {
          hasMore = false;
        }

        // Log progress
        console.log(`Fetched ${allClients.length} clients so far...`);
      }

      return allClients;
    } catch (error) {
      console.error(
        "Error fetching all clients:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Check if client has active subscription based on custom fields or invoices
  async checkClientSubscriptionStatus(clientId) {
    try {
      // First, get client details including custom fields
      const client = await this.getClient(clientId);

      // Check custom fields for subscription status
      const customFields = client.CustomFields || [];
      const subscriptionField = customFields.find(
        (field) =>
          field.Name &&
          (field.Name.toLowerCase().includes("subscription") ||
            field.Name.toLowerCase().includes("status") ||
            field.Name.toLowerCase().includes("active")),
      );

      if (subscriptionField && subscriptionField.Value) {
        const value = subscriptionField.Value.toLowerCase();
        if (value.includes("active") || value.includes("subscribed")) {
          return { status: "subscribed", source: "custom_field" };
        }
        if (value.includes("cancelled") || value.includes("canceled")) {
          return { status: "cancelled", source: "custom_field" };
        }
      }

      // Check recent invoices for subscription payments
      const invoices = await this.getClientInvoices(clientId);
      if (invoices && invoices.length > 0) {
        // Sort invoices by date (newest first)
        const sortedInvoices = invoices.sort(
          (a, b) => new Date(b.InvoiceDate || 0) - new Date(a.InvoiceDate || 0),
        );

        // Check recent invoices for subscription-related items
        for (const invoice of sortedInvoices.slice(0, 5)) {
          // Check last 5 invoices
          const items = invoice.Items || [];
          const hasSubscription = items.some((item) => {
            const desc = (item.Description || "").toLowerCase();
            return (
              desc.includes("subscription") ||
              desc.includes("monthly") ||
              desc.includes("membership") ||
              desc.includes("semaglutide") ||
              desc.includes("tirzepatide")
            );
          });

          if (hasSubscription) {
            if (invoice.Status === "Paid") {
              // Check if it's recent (within last 35 days for monthly)
              const invoiceDate = new Date(invoice.InvoiceDate);
              const daysSince =
                (Date.now() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24);

              if (daysSince <= 35) {
                return { status: "subscribed", source: "recent_invoice" };
              }
            }
          }
        }

        // If we found subscription invoices but none are recent/paid
        const hasAnySubscriptionInvoice = invoices.some((invoice) => {
          const items = invoice.Items || [];
          return items.some((item) => {
            const desc = (item.Description || "").toLowerCase();
            return (
              desc.includes("subscription") ||
              desc.includes("monthly") ||
              desc.includes("membership")
            );
          });
        });

        if (hasAnySubscriptionInvoice) {
          return { status: "cancelled", source: "old_invoice" };
        }
      }

      // Default to intake if no subscription info found
      return { status: "intake", source: "default" };
    } catch (error) {
      console.error(
        `Error checking subscription status for client ${clientId}:`,
        error.message,
      );
      return { status: "intake", source: "error" };
    }
  }

  // Categorize all clients into buckets
  async categorizeAllClients(progressCallback = null) {
    try {
      console.log("🔄 Starting to fetch all clients from IntakeQ...");
      const allClients = await this.fetchAllClients(false); // Don't include archived
      console.log(`✅ Fetched ${allClients.length} total clients`);

      const buckets = {
        intake: [],
        subscribed: [],
        cancelled: [],
      };

      let processed = 0;

      for (const client of allClients) {
        try {
          const subscriptionInfo = await this.checkClientSubscriptionStatus(
            client.Id,
          );

          const clientData = {
            id: client.Id,
            firstName: client.FirstName,
            lastName: client.LastName,
            email: client.Email,
            phone: client.Phone,
            dateCreated: client.DateCreated,
            lastUpdated: client.LastUpdated,
            subscriptionSource: subscriptionInfo.source,
            customFields: client.CustomFields || [],
          };

          buckets[subscriptionInfo.status].push(clientData);

          processed++;
          if (progressCallback) {
            progressCallback({
              current: processed,
              total: allClients.length,
              percentage: Math.round((processed / allClients.length) * 100),
            });
          }

          // Log progress every 10 clients
          if (processed % 10 === 0) {
            console.log(
              `Processed ${processed}/${allClients.length} clients (${Math.round((processed / allClients.length) * 100)}%)`,
            );
          }
        } catch (error) {
          console.error(`Error processing client ${client.Id}:`, error.message);
        }
      }

      console.log("\n📊 Final categorization:");
      console.log(`- Intake: ${buckets.intake.length} clients`);
      console.log(`- Subscribed: ${buckets.subscribed.length} clients`);
      console.log(`- Cancelled: ${buckets.cancelled.length} clients`);

      return buckets;
    } catch (error) {
      console.error("Error categorizing clients:", error.message);
      throw error;
    }
  }
}

module.exports = IntakeQClient;
