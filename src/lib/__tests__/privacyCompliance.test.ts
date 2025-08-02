import { PrivacyCompliance } from '../privacyCompliance';

describe('PrivacyCompliance', () => {
  describe('validateData', () => {
    it('validates clean data successfully', () => {
      const cleanData = {
        mood: 'chill',
        volume: 0.7,
        favorites: ['song1', 'song2']
      };

      const result = PrivacyCompliance.validateData(cleanData, 'test');
      expect(result).toBe(true);
    });

    it('detects forbidden personal data fields', () => {
      const personalData = {
        mood: 'chill',
        email: 'user@example.com',
        volume: 0.7
      };

      const result = PrivacyCompliance.validateData(personalData, 'test');
      expect(result).toBe(false);
    });

    it('detects nested personal data', () => {
      const nestedPersonalData = {
        settings: {
          mood: 'chill',
          user: {
            name: 'John Doe',
            preferences: {
              volume: 0.7
            }
          }
        }
      };

      const result = PrivacyCompliance.validateData(nestedPersonalData, 'test');
      expect(result).toBe(false);
    });

    it('handles non-object data', () => {
      const primitiveData = 'just a string';
      const result = PrivacyCompliance.validateData(primitiveData, 'test');
      expect(result).toBe(true);
    });

    it('handles null and undefined data', () => {
      expect(PrivacyCompliance.validateData(null, 'test')).toBe(true);
      expect(PrivacyCompliance.validateData(undefined, 'test')).toBe(true);
    });
  });

  describe('sanitizeData', () => {
    it('removes forbidden fields from data', () => {
      const dataWithPersonalInfo = {
        mood: 'chill',
        email: 'user@example.com',
        phone: '123-456-7890',
        volume: 0.7,
        name: 'John Doe'
      };

      const sanitized = PrivacyCompliance.sanitizeData(dataWithPersonalInfo, 'test');

      expect(sanitized).toEqual({
        mood: 'chill',
        volume: 0.7
      });
      expect(sanitized).not.toHaveProperty('email');
      expect(sanitized).not.toHaveProperty('phone');
      expect(sanitized).not.toHaveProperty('name');
    });

    it('recursively sanitizes nested objects', () => {
      const nestedData = {
        settings: {
          mood: 'chill',
          user: {
            email: 'user@example.com',
            preferences: {
              volume: 0.7,
              phone: '123-456-7890'
            }
          }
        },
        metadata: {
          created: '2023-01-01',
          ip: '192.168.1.1'
        }
      };

      const sanitized = PrivacyCompliance.sanitizeData(nestedData, 'test');

      expect(sanitized.settings.mood).toBe('chill');
      expect(sanitized.settings.user.preferences.volume).toBe(0.7);
      expect(sanitized.metadata.created).toBe('2023-01-01');
      
      expect(sanitized.settings.user).not.toHaveProperty('email');
      expect(sanitized.settings.user.preferences).not.toHaveProperty('phone');
      expect(sanitized.metadata).not.toHaveProperty('ip');
    });

    it('handles different field name variations', () => {
      const dataWithVariations = {
        email: 'test@example.com',
        Email: 'test2@example.com',
        EMAIL: 'test3@example.com',
        user_email: 'test4@example.com',
        'user-email': 'test5@example.com',
        mood: 'chill'
      };

      const sanitized = PrivacyCompliance.sanitizeData(dataWithVariations, 'test');

      expect(sanitized).toEqual({ mood: 'chill' });
    });

    it('preserves non-object data', () => {
      const primitiveData = 'just a string';
      const sanitized = PrivacyCompliance.sanitizeData(primitiveData, 'test');
      expect(sanitized).toBe('just a string');
    });
  });

  describe('validateUrl', () => {
    it('validates clean URLs', () => {
      const cleanUrl = 'https://api.example.com/songs?mood=chill&format=mp3';
      const result = PrivacyCompliance.validateUrl(cleanUrl);
      expect(result).toBe(true);
    });

    it('detects forbidden URL patterns', () => {
      const authUrl = 'https://api.example.com/api/auth/login';
      const result = PrivacyCompliance.validateUrl(authUrl);
      expect(result).toBe(false);
    });

    it('detects personal data in query parameters', () => {
      const urlWithPersonalData = 'https://api.example.com/songs?email=user@example.com&mood=chill';
      const result = PrivacyCompliance.validateUrl(urlWithPersonalData);
      expect(result).toBe(false);
    });

    it('detects personal data in parameter values', () => {
      const urlWithPersonalValue = 'https://api.example.com/songs?user=john.doe@example.com';
      const result = PrivacyCompliance.validateUrl(urlWithPersonalValue);
      expect(result).toBe(false);
    });

    it('handles malformed URLs gracefully', () => {
      const malformedUrl = 'not-a-valid-url';
      const result = PrivacyCompliance.validateUrl(malformedUrl);
      expect(result).toBe(false); // Should handle error gracefully
    });
  });

  describe('sanitizeUrl', () => {
    it('removes sensitive parameters from URL', () => {
      const urlWithSensitiveParams = 'https://api.example.com/songs?mood=chill&email=user@example.com&format=mp3';
      const sanitized = PrivacyCompliance.sanitizeUrl(urlWithSensitiveParams);
      
      expect(sanitized).toContain('mood=chill');
      expect(sanitized).toContain('format=mp3');
      expect(sanitized).not.toContain('email=');
    });

    it('preserves clean URLs unchanged', () => {
      const cleanUrl = 'https://api.example.com/songs?mood=chill&format=mp3';
      const sanitized = PrivacyCompliance.sanitizeUrl(cleanUrl);
      expect(sanitized).toBe(cleanUrl);
    });

    it('handles URLs without query parameters', () => {
      const simpleUrl = 'https://api.example.com/songs';
      const sanitized = PrivacyCompliance.sanitizeUrl(simpleUrl);
      expect(sanitized).toBe(simpleUrl);
    });
  });

  describe('prepareForStorage', () => {
    it('prepares valid data for storage', () => {
      const validData = { mood: 'chill', volume: 0.7 };
      const prepared = PrivacyCompliance.prepareForStorage(validData, 'mood_preferences', 'test');
      
      expect(prepared).toEqual(validData);
    });

    it('rejects data when collection not allowed', () => {
      const data = { analytics: 'some data' };
      const prepared = PrivacyCompliance.prepareForStorage(data, 'forbidden_type', 'test');
      
      expect(prepared).toBeNull();
    });

    it('rejects data with personal information', () => {
      const personalData = { mood: 'chill', email: 'user@example.com' };
      const prepared = PrivacyCompliance.prepareForStorage(personalData, 'mood_preferences', 'test');
      
      expect(prepared).toBeNull();
    });

    it('sanitizes data before storage', () => {
      const dataWithForbiddenFields = {
        mood: 'chill',
        volume: 0.7,
        tempEmail: 'temp@example.com' // This should be removed
      };
      
      const prepared = PrivacyCompliance.prepareForStorage(dataWithForbiddenFields, 'mood_preferences', 'test');
      
      expect(prepared).toEqual({
        mood: 'chill',
        volume: 0.7
      });
    });
  });

  describe('createErrorReport', () => {
    it('creates privacy-compliant error report', () => {
      const error = new Error('Test error message');
      const report = PrivacyCompliance.createErrorReport(error, 'test-context');
      
      expect(report).toHaveProperty('message', 'Test error message');
      expect(report).toHaveProperty('name', 'Error');
      expect(report).toHaveProperty('context', 'test-context');
      expect(report).toHaveProperty('timestamp');
      expect(report).not.toHaveProperty('email');
      expect(report).not.toHaveProperty('phone');
    });

    it('sanitizes error report data', () => {
      const error = new Error('Error with email: user@example.com');
      error.stack = 'Stack trace with phone: 123-456-7890';
      
      const report = PrivacyCompliance.createErrorReport(error, 'test');
      
      // The sanitization should remove any personal data from the report
      expect(report.message).toBe('Error with email: user@example.com'); // Message preserved but report sanitized
    });
  });

  describe('generateComplianceReport', () => {
    it('generates compliance report with no issues', () => {
      // Mock a clean audit
      jest.doMock('../privacyManager', () => ({
        privacyManager: {
          auditStoredData: () => ({
            personalDataFound: false,
            dataTypes: ['mood_preferences', 'playback_settings'],
            storageUsage: { total: 1024 },
            recommendations: []
          })
        }
      }));

      const report = PrivacyCompliance.generateComplianceReport();
      
      expect(report.compliant).toBe(true);
      expect(report.issues).toHaveLength(0);
      expect(report.recommendations).toHaveLength(0);
    });
  });

  describe('isDataCollectionEnvironment', () => {
    it('returns false in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const result = PrivacyCompliance.isDataCollectionEnvironment();
      expect(result).toBe(false);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('returns false in test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      
      const result = PrivacyCompliance.isDataCollectionEnvironment();
      expect(result).toBe(false);
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});