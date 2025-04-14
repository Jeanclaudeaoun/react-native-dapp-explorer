import { ProviderRpcError, ProviderErrorCode } from './provider-utils';

interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: string;
  salt?: string;
}

interface TypedDataField {
  name: string;
  type: string;
}

interface TypedDataTypes {
  [key: string]: TypedDataField[];
}

export class SigningManager {
  static validatePersonalMessage(message: string): string {
    if (typeof message !== 'string') {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: 'Personal message must be a string',
      });
    }

    // Convert to hex if not already
    if (!message.startsWith('0x')) {
      return '0x' + Buffer.from(message, 'utf8').toString('hex');
    }
    return message;
  }

  static validateTypedData(
    domain: TypedDataDomain,
    types: TypedDataTypes,
    message: Record<string, any>
  ): void {
    // Validate domain
    if (domain.chainId && typeof domain.chainId !== 'number') {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: 'Invalid chainId in domain',
      });
    }

    if (domain.verifyingContract && !/^0x[0-9a-fA-F]{40}$/.test(domain.verifyingContract)) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: 'Invalid verifyingContract address in domain',
      });
    }

    // Validate types
    if (!types.EIP712Domain) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: 'Missing EIP712Domain type definition',
      });
    }

    // Validate all referenced types exist
    const validateType = (typeName: string, visited = new Set<string>()): void => {
      if (visited.has(typeName)) {
        throw new ProviderRpcError({
          code: ProviderErrorCode.INVALID_PARAMS,
          message: `Circular reference in type ${typeName}`,
        });
      }

      visited.add(typeName);
      const type = types[typeName];
      if (!type) {
        throw new ProviderRpcError({
          code: ProviderErrorCode.INVALID_PARAMS,
          message: `Type ${typeName} not found in types definition`,
        });
      }

      for (const field of type) {
        if (field.type.endsWith('[]')) {
          const baseType = field.type.slice(0, -2);
          if (types[baseType]) {
            validateType(baseType, new Set(visited));
          }
        } else if (types[field.type]) {
          validateType(field.type, new Set(visited));
        }
      }
    };

    // Validate all types are well-formed
    for (const typeName of Object.keys(types)) {
      validateType(typeName);
    }

    // Validate message matches primary type structure
    const validateData = (data: any, typeFields: TypedDataField[]): void => {
      for (const field of typeFields) {
        const value = data[field.name];
        if (value === undefined) {
          throw new ProviderRpcError({
            code: ProviderErrorCode.INVALID_PARAMS,
            message: `Missing value for field ${field.name}`,
          });
        }

        if (field.type.endsWith('[]')) {
          if (!Array.isArray(value)) {
            throw new ProviderRpcError({
              code: ProviderErrorCode.INVALID_PARAMS,
              message: `Expected array for field ${field.name}`,
            });
          }
          const baseType = field.type.slice(0, -2);
          if (types[baseType]) {
            value.forEach((item) => validateData(item, types[baseType]));
          }
        } else if (types[field.type]) {
          validateData(value, types[field.type]);
        }
      }
    };

    // Validate message structure against types
    for (const [typeName, typeFields] of Object.entries(types)) {
      if (typeName !== 'EIP712Domain' && message[typeName]) {
        validateData(message[typeName], typeFields);
      }
    }
  }

  static createSignatureRequest(
    method: string,
    params: any[]
  ): { title: string; message: string; data?: any } {
    switch (method) {
      case 'personal_sign':
        return {
          title: 'Sign Message',
          message: params[0].startsWith('0x') 
            ? Buffer.from(params[0].slice(2), 'hex').toString('utf8')
            : params[0],
        };

      case 'eth_sign':
        return {
          title: 'Sign Message (Unsafe)',
          message: 'Warning: This is an unsafe signing method. The message will be signed directly without a prefix.',
          data: params[1],
        };

      case 'eth_signTypedData':
      case 'eth_signTypedData_v4':
        const typedData = JSON.parse(params[1]);
        return {
          title: 'Sign Typed Data',
          message: `Domain: ${typedData.domain.name || 'Unknown'}\nVersion: ${typedData.domain.version || '1'}`,
          data: typedData,
        };

      default:
        throw new ProviderRpcError({
          code: ProviderErrorCode.UNSUPPORTED_METHOD,
          message: `Unsupported signing method: ${method}`,
        });
    }
  }
}
